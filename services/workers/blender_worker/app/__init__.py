"""
Blender Worker Tasks - Handles 3D rendering and scene manipulation
"""

import os
import subprocess
import json
from typing import Dict, Any
from pathlib import Path
import boto3
import structlog
from celery import Celery

from app.core.config import settings

logger = structlog.get_logger()

# Initialize Celery app
celery_app = Celery(
    "blender_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend
)

# Initialize S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=settings.s3_endpoint_url,
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key
)

@celery_app.task(name="blender_worker.render_scene")
def render_scene(parameters: Dict[str, Any], callback_url: str = None):
    """Render a Blender scene"""
    try:
        logger.info("Starting scene render", parameters=parameters)

        # Extract parameters
        scene_file = parameters.get("scene", "default.blend")
        output_format = parameters.get("output_format", "png")
        resolution = parameters.get("resolution", [1920, 1080])
        frame_start = parameters.get("frame_start", 1)
        frame_end = parameters.get("frame_end", 1)

        # Generate output filename
        job_id = render_scene.request.id
        output_filename = f"render_{job_id}"
        output_path = f"/app/output/{output_filename}"

        # Create Blender script
        script_content = f'''
import bpy
import sys

# Set render settings
bpy.context.scene.render.resolution_x = {resolution[0]}
bpy.context.scene.render.resolution_y = {resolution[1]}
bpy.context.scene.render.image_settings.file_format = '{output_format.upper()}'
bpy.context.scene.render.filepath = "{output_path}"

# Set frame range
bpy.context.scene.frame_start = {frame_start}
bpy.context.scene.frame_end = {frame_end}

# Render
bpy.ops.render.render(animation=True, write_still=True)

print("Render completed successfully")
'''

        # Write script to file
        script_path = f"/app/cache/render_{job_id}.py"
        with open(script_path, 'w') as f:
            f.write(script_content)

        # Find Blender executable
        blender_path = "/opt/blender/blender"  # Adjust based on actual installation

        # Run Blender
        cmd = [
            blender_path,
            "--background",
            "--python", script_path
        ]

        # Add scene file if specified
        scene_path = f"/app/assets/{scene_file}"
        if os.path.exists(scene_path):
            cmd.extend(["-f", scene_path])

        logger.info("Running Blender command", command=cmd)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            raise Exception(f"Blender render failed: {result.stderr}")

        # Check if output files were created
        output_files = list(Path("/app/output").glob(f"{output_filename}*"))
        if not output_files:
            raise Exception("No output files generated")

        # Upload to S3
        uploaded_urls = []
        for output_file in output_files:
            file_key = f"renders/{output_file.name}"
            s3_client.upload_file(
                str(output_file),
                settings.s3_bucket_name,
                file_key
            )
            uploaded_urls.append(f"{settings.s3_endpoint_url}/{settings.s3_bucket_name}/{file_key}")

        # Clean up
        os.remove(script_path)
        for output_file in output_files:
            os.remove(str(output_file))

        result_data = {
            "job_id": job_id,
            "output_files": len(output_files),
            "uploaded_urls": uploaded_urls,
            "render_settings": {
                "resolution": resolution,
                "format": output_format,
                "frames": f"{frame_start}-{frame_end}"
            }
        }

        # Send callback if provided
        if callback_url:
            _send_callback(callback_url, {
                "status": "completed",
                "job_type": "render",
                "result": result_data
            })

        logger.info("Scene render completed", job_id=job_id, files=len(output_files))
        return result_data

    except Exception as e:
        logger.error("Scene render failed", error=str(e), job_id=render_scene.request.id)
        if callback_url:
            _send_callback(callback_url, {
                "status": "failed",
                "error": str(e)
            })
        raise

@celery_app.task(name="blender_worker.modify_scene")
def modify_scene(parameters: Dict[str, Any], callback_url: str = None):
    """Modify a Blender scene programmatically"""
    try:
        logger.info("Starting scene modification", parameters=parameters)

        # Extract parameters
        scene_file = parameters.get("scene", "default.blend")
        modifications = parameters.get("modifications", [])

        job_id = modify_scene.request.id
        modified_scene_path = f"/app/output/modified_{job_id}.blend"

        # Create Blender script for modifications
        script_content = f'''
import bpy
import json

# Load scene if specified
scene_path = "/app/assets/{scene_file}"
if bpy.ops.wm.open_mainfile(filepath=scene_path) != {{"FINISHED"}}:
    print("Warning: Could not load scene file, using default scene")

# Apply modifications
modifications = {json.dumps(modifications)}

for mod in modifications:
    mod_type = mod.get("type")
    if mod_type == "add_cube":
        bpy.ops.mesh.primitive_cube_add(size=mod.get("size", 2.0), location=mod.get("location", [0, 0, 0]))
    elif mod_type == "add_light":
        bpy.ops.object.light_add(type=mod.get("light_type", "POINT"), location=mod.get("location", [0, 0, 0]))
    elif mod_type == "set_camera":
        camera = bpy.context.scene.camera
        if camera:
            camera.location = mod.get("location", [0, 0, 10])
            camera.rotation_euler = mod.get("rotation", [0, 0, 0])
    # Add more modification types as needed

# Save modified scene
bpy.ops.wm.save_as_mainfile(filepath="{modified_scene_path}")

print("Scene modification completed")
'''

        # Write and execute script
        script_path = f"/app/cache/modify_{job_id}.py"
        with open(script_path, 'w') as f:
            f.write(script_content)

        blender_path = "/opt/blender/blender"
        result = subprocess.run(
            [blender_path, "--background", "--python", script_path],
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            raise Exception(f"Scene modification failed: {result.stderr}")

        # Upload modified scene to S3
        scene_key = f"scenes/modified_{job_id}.blend"
        s3_client.upload_file(
            modified_scene_path,
            settings.s3_bucket_name,
            scene_key
        )

        # Clean up
        os.remove(script_path)
        os.remove(modified_scene_path)

        result_data = {
            "job_id": job_id,
            "scene_url": f"{settings.s3_endpoint_url}/{settings.s3_bucket_name}/{scene_key}",
            "modifications_applied": len(modifications)
        }

        if callback_url:
            _send_callback(callback_url, {
                "status": "completed",
                "job_type": "scene_modification",
                "result": result_data
            })

        logger.info("Scene modification completed", job_id=job_id)
        return result_data

    except Exception as e:
        logger.error("Scene modification failed", error=str(e), job_id=modify_scene.request.id)
        if callback_url:
            _send_callback(callback_url, {
                "status": "failed",
                "error": str(e)
            })
        raise

def _send_callback(callback_url: str, payload: Dict[str, Any]):
    """Send callback to Slack"""
    import httpx

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(callback_url, json=payload)
            response.raise_for_status()
            logger.info("Callback sent successfully", callback_url=callback_url)
    except Exception as e:
        logger.error("Failed to send callback", error=str(e), callback_url=callback_url)

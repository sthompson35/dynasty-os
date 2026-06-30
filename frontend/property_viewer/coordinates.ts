import * as THREE from 'three';

export const FT_TO_M = 0.3048;

/** Blender Z-up feet → Three.js Y-up meters (matches glTF export orientation). */
export function blenderFeetToThreeVector([x, y, z]: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(x * FT_TO_M, z * FT_TO_M, -y * FT_TO_M);
}

export function blenderFeetToThreeTuple([x, y, z]: [number, number, number]): [number, number, number] {
  const v = blenderFeetToThreeVector([x, y, z]);
  return [v.x, v.y, v.z];
}

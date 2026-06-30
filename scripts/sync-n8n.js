#!/usr/bin/env node
// sync-n8n.js — runs once at stack startup.
// 1. Resolves the Dynasty API public URL (Railway env var, ngrok domain, or ngrok API)
// 2. Patches the Dynasty Config node URL in V2 and V3 n8n workflows
// 3. Sets the n8n built-in Variable `dynastyApiUrl` so $vars.dynastyApiUrl resolves
//    in V3 webhook-triggered flows (which don't run through the Config Set node)
// 4. Activates both workflows

const N8N_API_KEY       = process.env.N8N_API_KEY       || ''
const N8N_CLOUD_URL     = (process.env.N8N_CLOUD_URL || 'https://ultimate-dynasty-os.app.n8n.cloud').replace(/\/$/, '')
const WORKFLOW_ID_V2    = process.env.N8N_WORKFLOW_ID    || 'OEGkyufLk21eS6lz'
const WORKFLOW_ID_V3    = process.env.N8N_WORKFLOW_ID_V3 || ''
const RAILWAY_API_URL   = (process.env.N8N_DYNASTY_API_URL || '').trim()
const NGROK_API_URL     = process.env.NGROK_API_URL      || 'http://host.docker.internal:4040/api/tunnels'
const NGROK_DOMAIN      = (process.env.NGROK_DOMAIN      || '').trim()
const MAX_RETRIES       = 30
const RETRY_DELAY_MS    = 3000

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function resolveApiUrl() {
  // Priority 1: Railway production URL set explicitly
  if (RAILWAY_API_URL) {
    console.log('  Using Railway production URL from N8N_DYNASTY_API_URL env var')
    return RAILWAY_API_URL.replace(/\/$/, '')
  }

  // Priority 2: Static ngrok domain
  if (NGROK_DOMAIN) {
    const url = NGROK_DOMAIN.startsWith('http') ? NGROK_DOMAIN : `https://${NGROK_DOMAIN}`
    console.log('  Using static domain from NGROK_DOMAIN env var')
    return url.replace(/\/$/, '')
  }

  // Priority 3: Dynamic ngrok inspection API
  console.log('  Polling ngrok inspection API...')
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(NGROK_API_URL)
      if (!res.ok) throw new Error(`ngrok API ${res.status}`)
      const data = await res.json()
      const tunnel = (data.tunnels ?? []).find(t => t.proto === 'https') ?? data.tunnels?.[0]
      if (tunnel?.public_url) {
        return tunnel.public_url.replace(/\/$/, '')
      }
      throw new Error('tunnel list empty — is ngrok running on the host?')
    } catch (err) {
      console.log(`  [${attempt}/${MAX_RETRIES}] ngrok not ready: ${err.message}`)
      await sleep(RETRY_DELAY_MS)
    }
  }
  throw new Error(`ngrok tunnel did not come up after ${MAX_RETRIES} retries`)
}

async function n8nRequest(path, method = 'GET', body) {
  const opts = {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${N8N_CLOUD_URL}/api/v1${path}`, opts)
  const text = await res.text()
  if (!res.ok) throw new Error(`n8n ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : {}
}

async function patchWorkflow(workflowId, apiUrl, label) {
  console.log(`\n  Fetching ${label} from n8n cloud...`)
  const workflow = await n8nRequest(`/workflows/${workflowId}`)
  console.log(`    ✓ "${workflow.name}" (active: ${workflow.active})`)

  const configNode = workflow.nodes?.find(n => n.id === 'dynasty-config' || n.name === 'Dynasty Config')
  if (!configNode) {
    console.warn(`    ⚠ Dynasty Config node not found in ${label} — skipping URL patch`)
    return workflow
  }

  const assignments = configNode.parameters?.assignments?.assignments ?? []
  const urlAssignment = assignments.find(a => a.name === 'dynastyApiUrl')
  if (!urlAssignment) {
    console.warn(`    ⚠ dynastyApiUrl assignment not found in ${label} Dynasty Config — skipping`)
    return workflow
  }

  const prev = urlAssignment.value
  urlAssignment.value = apiUrl
  console.log(`    was: ${prev}`)
  console.log(`    now: ${apiUrl}`)

  const ALLOWED_SETTINGS = ['executionOrder','timezone','errorWorkflow','callerPolicy',
    'callerIds','saveManualExecutions','saveDataSuccessExecution','saveDataErrorExecution',
    'saveExecutionProgress','executionTimeout','maxExecutions']
  const safeSettings = Object.fromEntries(
    Object.entries(workflow.settings ?? {}).filter(([k]) => ALLOWED_SETTINGS.includes(k))
  )
  await n8nRequest(`/workflows/${workflowId}`, 'PUT', {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: safeSettings,
    staticData: workflow.staticData ?? null,
  })
  console.log(`    ✓ ${label} saved`)
  return workflow
}

async function activateWorkflow(workflowId, workflow, label) {
  if (workflow.active) {
    console.log(`    ✓ ${label} already active`)
  } else {
    await n8nRequest(`/workflows/${workflowId}/activate`, 'POST')
    console.log(`    ✓ ${label} activated`)
  }
}

async function syncN8nVariable(apiUrl) {
  // Upsert the n8n built-in Variable `dynastyApiUrl` so $vars.dynastyApiUrl
  // resolves in V3 flows that don't pass through the Dynasty Config Set node.
  try {
    const list = await n8nRequest('/variables')
    const vars  = list.data ?? list ?? []
    const existing = vars.find(v => v.key === 'dynastyApiUrl')
    if (existing) {
      await n8nRequest(`/variables/${existing.id}`, 'PATCH', { value: apiUrl })
      console.log('    ✓ n8n Variable dynastyApiUrl updated')
    } else {
      await n8nRequest('/variables', 'POST', { key: 'dynastyApiUrl', value: apiUrl, type: 'string' })
      console.log('    ✓ n8n Variable dynastyApiUrl created')
    }
  } catch (err) {
    console.warn(`    ⚠ Could not sync n8n Variable (non-fatal): ${err.message}`)
    console.warn('      V3 flows will fall back to http://localhost:8010 until this resolves.')
  }
}

async function main() {
  console.log('━━━ Dynasty n8n Sync ━━━')

  if (!N8N_API_KEY) {
    console.error('\nERROR: N8N_API_KEY is not set in .env')
    console.error('  Get it from: https://ultimate-dynasty-os.app.n8n.cloud/settings/api')
    process.exit(1)
  }

  // 1. Resolve API URL
  console.log('\n[1/5] Resolving Dynasty API URL...')
  const apiUrl = await resolveApiUrl()
  console.log(`      ✓ ${apiUrl}`)

  // 2. Patch V2 workflow
  console.log('\n[2/5] Patching V2 workflow...')
  const wfV2 = await patchWorkflow(WORKFLOW_ID_V2, apiUrl, 'V2')

  // 3. Patch V3 workflow (if configured)
  let wfV3 = null
  if (WORKFLOW_ID_V3) {
    console.log('\n[3/5] Patching V3 workflow...')
    wfV3 = await patchWorkflow(WORKFLOW_ID_V3, apiUrl, 'V3')
  } else {
    console.log('\n[3/5] Skipping V3 patch (N8N_WORKFLOW_ID_V3 not set)')
  }

  // 4. Sync n8n built-in Variable for V3 $vars.dynastyApiUrl access
  console.log('\n[4/5] Syncing n8n Variable dynastyApiUrl...')
  await syncN8nVariable(apiUrl)

  // 5. Activate workflows
  console.log('\n[5/5] Activating workflows...')
  await activateWorkflow(WORKFLOW_ID_V2, wfV2, 'V2')
  if (WORKFLOW_ID_V3 && wfV3) {
    await activateWorkflow(WORKFLOW_ID_V3, wfV3, 'V3')
  }

  console.log('\n━━━ Dynasty n8n Ready ━━━')
  console.log(`  API:              ${apiUrl}`)
  console.log(`  V2 Chat:          ${N8N_CLOUD_URL}/webhook/eb99c858-ecfc-429b-81ee-8f57e932681f/chat`)
  console.log(`  V2 Deal Intake:   ${N8N_CLOUD_URL}/webhook/dynasty-deal-intake`)
  if (WORKFLOW_ID_V3) {
    console.log(`  V3 Deal Intake:   ${N8N_CLOUD_URL}/webhook/dynasty-deal-intake`)
    console.log(`  V3 Hot Lead:      ${N8N_CLOUD_URL}/webhook/dynasty-hot-lead`)
    console.log(`  V3 Deal Status:   ${N8N_CLOUD_URL}/webhook/dynasty-deal-status`)
    console.log(`  V3 Capital Gap:   ${N8N_CLOUD_URL}/webhook/dynasty-capital-gap`)
    console.log(`  V3 Draw Request:  ${N8N_CLOUD_URL}/webhook/dynasty-draw-request`)
    console.log(`  V3 ATLAS Delay:   ${N8N_CLOUD_URL}/webhook/dynasty-atlas-delay`)
    console.log(`  V3 Investor Pkg:  ${N8N_CLOUD_URL}/webhook/dynasty-investor-package`)
    console.log(`  V3 Chat:          ${N8N_CLOUD_URL}/webhook/dynasty-chat`)
  }
  console.log('')
}

main().catch(err => {
  console.error('\n[sync-n8n] FAILED:', err.message)
  process.exit(1)
})

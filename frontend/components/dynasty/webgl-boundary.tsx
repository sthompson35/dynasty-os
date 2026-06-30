'use client'

import React from 'react'

// Detects whether the current browser/device can create a WebGL context.
// Runs client-side only. Used to gate the 3D scene so we never mount a Canvas
// on a device that cannot render it (which would otherwise throw
// "Error creating WebGL context" and crash the view).
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    return Boolean(gl && typeof (gl as WebGLRenderingContext).getParameter === 'function')
  } catch {
    return false
  }
}

type Props = {
  fallback: React.ReactNode
  children: React.ReactNode
}

type State = {
  hasError: boolean
}

// Safety net: catches any runtime error from the 3D scene (e.g. a lost WebGL
// context mid-session) and renders a graceful fallback instead of crashing.
export class WebGLErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('3D scene failed to render', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

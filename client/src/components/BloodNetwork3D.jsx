import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * BloodNetwork3D - Option A: Floating 3D Blood Drops Connected Network
 * Lightweight Three.js implementation with glossy red teardrop meshes,
 * ambient floating motion, dynamic network lines, mouse parallax,
 * and WebGL / prefers-reduced-motion fallback.
 */
export default function BloodNetwork3D({ className = '' }) {
  const mountRef = useRef(null)
  const [hasWebGL, setHasWebGL] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // 1. Accessibility: check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 2. Check WebGL availability
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas')
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
      } catch (_) {
        return false
      }
    }

    if (!checkWebGL()) {
      setHasWebGL(false)
      setIsLoaded(true)
      return
    }

    const container = mountRef.current
    if (!container) return

    let width = container.clientWidth || 500
    let height = container.clientHeight || 600

    // 3. Three.js Scene Setup
    const scene = new THREE.Scene()
    // Soft transparent background to blend with CSS gradient
    scene.background = null

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 14)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
      container.appendChild(renderer.domElement)
    } catch (err) {
      console.warn('[BloodNetwork3D] WebGL renderer failed:', err)
      setHasWebGL(false)
      setIsLoaded(true)
      return
    }

    // 4. Lighting - Crisp Studio Setup for Medical Red Gloss
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2)
    mainLight.position.set(6, 8, 8)
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xfecaca, 1.0)
    fillLight.position.set(-6, -4, 4)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0xff4757, 3, 20)
    rimLight.position.set(0, 5, 4)
    scene.add(rimLight)

    // 5. Construct 3D Teardrop / Blood Drop Geometry
    // We create a custom smooth parametric teardrop using LatheGeometry
    const createTeardropGeometry = (scale = 1) => {
      const points = []
      const segments = 24
      // Generate vertical cross-section of a teardrop
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI
        // Width profile equation for natural teardrop
        const radius = Math.sin(t) * Math.pow(Math.cos(t / 2), 1.6) * 0.85 * scale
        const y = (Math.cos(t) * 1.3 - 0.2) * scale
        points.push(new THREE.Vector2(Math.max(0.001, radius), y))
      }
      const geo = new THREE.LatheGeometry(points, 32)
      geo.computeVertexNormals()
      return geo
    }

    // Glossy crimson material
    const dropMaterial = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.18,
      metalness: 0.08,
      envMapIntensity: 1.2,
    })

    const accentDropMaterial = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.22,
      metalness: 0.12,
    })

    const heroDropMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.12,
      metalness: 0.05,
    })

    // 6. Generate Drop Network Nodes
    const drops = []
    const numDrops = 14

    // Center focal hero drop
    const heroGeo = createTeardropGeometry(1.35)
    const heroMesh = new THREE.Mesh(heroGeo, heroDropMaterial)
    heroMesh.position.set(0, 0.4, 0)
    scene.add(heroMesh)
    drops.push({
      mesh: heroMesh,
      basePos: new THREE.Vector3(0, 0.4, 0),
      speed: 0.0008,
      amplitude: new THREE.Vector3(0.25, 0.35, 0.2),
      rotSpeed: new THREE.Vector3(0.004, 0.006, 0.002),
      offset: 0
    })

    // Satellite drops in floating 3D volume
    const spreadX = 4.8
    const spreadY = 3.8
    const spreadZ = 2.5

    for (let i = 0; i < numDrops - 1; i++) {
      const scale = 0.45 + Math.random() * 0.45
      const geo = createTeardropGeometry(scale)
      const mat = i % 3 === 0 ? accentDropMaterial : dropMaterial
      const mesh = new THREE.Mesh(geo, mat)

      const theta = (i / (numDrops - 1)) * Math.PI * 2 + (Math.random() * 0.4)
      const r = 2.2 + Math.random() * 2.6
      const x = Math.cos(theta) * r + (Math.random() - 0.5) * 1.2
      const y = Math.sin(theta) * (r * 0.8) + (Math.random() - 0.5) * 1.0
      const z = (Math.random() - 0.5) * spreadZ

      mesh.position.set(x, y, z)
      mesh.rotation.z = (Math.random() - 0.5) * 0.4
      scene.add(mesh)

      drops.push({
        mesh,
        basePos: new THREE.Vector3(x, y, z),
        speed: 0.0006 + Math.random() * 0.0008,
        amplitude: new THREE.Vector3(
          0.2 + Math.random() * 0.25,
          0.25 + Math.random() * 0.35,
          0.15 + Math.random() * 0.2
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.008,
          0.004 + Math.random() * 0.006,
          (Math.random() - 0.5) * 0.005
        ),
        offset: Math.random() * Math.PI * 2
      })
    }

    // 7. Dynamic Network Connecting Lines
    const maxLineConnections = 30
    const linePositions = new Float32Array(maxLineConnections * 2 * 3)
    const lineColors = new Float32Array(maxLineConnections * 2 * 3)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.NormalBlending,
      linewidth: 1.5
    })

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lineSegments)

    // 8. Mouse Parallax Tracking
    let targetMouseX = 0
    let targetMouseY = 0
    let mouseX = 0
    let mouseY = 0

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      targetMouseX = x * 0.4
      targetMouseY = y * 0.3
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // 9. Resize Observer
    const handleResize = () => {
      if (!container || !renderer) return
      width = container.clientWidth || 500
      height = container.clientHeight || 600
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(container)

    // 10. Animation Loop
    let animationFrameId
    let time = 0

    const animate = () => {
      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(animate)
      }

      time += 0.015

      // Smooth camera interpolation (Parallax)
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05
      camera.position.x = mouseX * 2
      camera.position.y = mouseY * 1.5
      camera.lookAt(0, 0, 0)

      // Update drops floating motion
      drops.forEach((d, idx) => {
        const t = time * 0.8 + d.offset
        d.mesh.position.x = d.basePos.x + Math.sin(t * 1.1) * d.amplitude.x
        d.mesh.position.y = d.basePos.y + Math.cos(t * 0.9) * d.amplitude.y
        d.mesh.position.z = d.basePos.z + Math.sin(t * 0.7) * d.amplitude.z

        d.mesh.rotation.x += d.rotSpeed.x
        d.mesh.rotation.y += d.rotSpeed.y
        d.mesh.rotation.z = Math.sin(t * 0.5) * 0.15
      })

      // Update Network Connecting Lines
      let lineIndex = 0
      const posAttr = lineGeometry.attributes.position
      const colorAttr = lineGeometry.attributes.color
      const connectThreshold = 3.6

      for (let i = 0; i < drops.length; i++) {
        for (let j = i + 1; j < drops.length; j++) {
          if (lineIndex >= maxLineConnections) break

          const p1 = drops[i].mesh.position
          const p2 = drops[j].mesh.position
          const dist = p1.distanceTo(p2)

          if (dist < connectThreshold) {
            const alpha = Math.max(0, 1 - dist / connectThreshold) * 0.85
            // Subtle pulsating connection
            const pulse = (Math.sin(time * 2 + i + j) + 1) * 0.5
            const finalAlpha = alpha * (0.6 + pulse * 0.4)

            const i6 = lineIndex * 6
            posAttr.array[i6 + 0] = p1.x
            posAttr.array[i6 + 1] = p1.y
            posAttr.array[i6 + 2] = p1.z
            posAttr.array[i6 + 3] = p2.x
            posAttr.array[i6 + 4] = p2.y
            posAttr.array[i6 + 5] = p2.z

            // Soft crimson/coral line color with distance falloff
            const r = 0.86
            const g = 0.15 + (1 - alpha) * 0.2
            const b = 0.15 + (1 - alpha) * 0.2

            colorAttr.array[i6 + 0] = r * finalAlpha
            colorAttr.array[i6 + 1] = g * finalAlpha
            colorAttr.array[i6 + 2] = b * finalAlpha
            colorAttr.array[i6 + 3] = r * finalAlpha
            colorAttr.array[i6 + 4] = g * finalAlpha
            colorAttr.array[i6 + 5] = b * finalAlpha

            lineIndex++
          }
        }
      }

      // Clear remaining line points
      for (let k = lineIndex; k < maxLineConnections; k++) {
        const i6 = k * 6
        for (let c = 0; c < 6; c++) {
          posAttr.array[i6 + c] = 0
          colorAttr.array[i6 + c] = 0
        }
      }

      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true

      renderer.render(scene, camera)
    }

    setIsLoaded(true)
    animate()

    // 11. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      resizeObserver.disconnect()

      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer?.dispose()
      heroGeo.dispose()
      dropMaterial.dispose()
      accentDropMaterial.dispose()
      heroDropMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
    }
  }, [])

  return (
    <div className={`blood-3d-panel ${className}`}>
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="blood-3d-canvas-container" />

      {/* Fallback for WebGL unassisted devices / browsers */}
      {!hasWebGL && (
        <div className="blood-3d-fallback">
          <div className="fallback-drop-pulse">🩸</div>
          <div className="fallback-ring fallback-ring-1" />
          <div className="fallback-ring fallback-ring-2" />
        </div>
      )}

      {/* Floating Trust & Telemetry Overlay Badges */}
      <div className="blood-3d-overlay-card top-left animate-fade-in">
        <span className="live-dot" />
        <div>
          <strong>Live Donor Network</strong>
          <p>Real-time Cold-Chain Dispatch</p>
        </div>
      </div>

      <div className="blood-3d-overlay-card bottom-right animate-fade-in">
        <span style={{ fontSize: '1.1rem' }}>🛡️</span>
        <div>
          <strong>Anti-Fraud Verified</strong>
          <p>Cryptographic QR Bag Passport</p>
        </div>
      </div>

      {/* Brand Tagline Banner */}
      <div className="blood-3d-bottom-caption">
        <h3 className="caption-title">Every drop connects a life.</h3>
        <p className="caption-sub">
          Connecting verified voluntary donors, regional blood banks, and hospital emergency trauma units across India.
        </p>
      </div>
    </div>
  )
}

"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, useGLTF, Environment } from "@react-three/drei"

interface ModelViewerProps {
  modelUrl: string
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={2} />
}

export function ModelViewer({ modelUrl }: ModelViewerProps) {
  return (
    <div className="w-full h-96 rounded-lg overflow-hidden bg-gray-100">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <Model url={modelUrl} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={2} maxDistance={10} />
        </Suspense>
      </Canvas>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">Click and drag to rotate • Scroll to zoom • Right-click to pan</p>
      </div>
    </div>
  )
}

import MirrorView from './components/MirrorView'

export default function App() {
  return (
    <MirrorView>
      <div className="absolute top-6 left-6 pointer-events-auto text-white text-2xl">
        Reloj
      </div>
      <button className="absolute bottom-6 left-6 pointer-events-auto text-black text-2xl">
        holaaaaaa
      </button>
    </MirrorView>
  )
}

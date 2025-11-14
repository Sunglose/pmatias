export default function NotFound() {
  return (
    <div className="min-h-screen w-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex items-center">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="flex justify-center">
          <img
            src="https://i.imgur.com/ln3BxJi.png"
            alt="Ilustración 404"
            className="w-[420px] max-w-full object-contain"
          />
        </div>
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="text-[80px] md:text-[112px] leading-none font-extrabold tracking-tight">
            404
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-semibold">
            ¡Uy! No encontramos esta página.
          </h2>

          <p className="mt-4 max-w-xl text-gray-600 dark:text-gray-400">
            La página que estás buscando no existe o fue movida. Verifica la URL
            o vuelve al inicio para continuar navegando.
          </p>

          <a
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium
                       bg-black text-white hover:opacity-90
                       dark:bg-white dark:text-black dark:hover:opacity-90 transition"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

import { Modal } from "../ui/Modal";

export default function TutorialModal({
  isOpen,
  title,
  text,
  step,
  total,
  onNext,
  onClose,
}) {
  const footer = (
    <div className="flex justify-center gap-3 w-full">
      <button
        type="button"
        onClick={onNext}
        className="bg-[#8F5400] text-white dark:bg-white dark:text-black rounded-lg px-4 py-2 text-sm hover:opacity-90"
      >
        {step < total ? "Siguiente" : "Finalizar"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="border border-gray-400 dark:border-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Cerrar
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <p className="text-gray-700 dark:text-gray-300">{text}</p>
      <div className="mt-4 text-xs text-gray-400">
        Paso {step} de {total}
      </div>
    </Modal>
  );
}

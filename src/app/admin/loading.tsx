export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="w-8 h-8 border-2 border-popline-pink border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Carregando"
      />
    </div>
  );
}

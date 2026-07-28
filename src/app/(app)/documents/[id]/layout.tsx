export default function DocumentEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-6 lg:-m-8 flex flex-col overflow-hidden" style={{ height: "calc(100% + 3rem)" }}>
      {children}
    </div>
  );
}

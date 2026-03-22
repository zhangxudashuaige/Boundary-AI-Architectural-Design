export function Panel({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-[30px] border border-white/10 bg-panel p-6 shadow-soft backdrop-blur-xl",
        className
      ].join(" ")}
    >
      {children}
    </div>
  );
}

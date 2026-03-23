export function Panel({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-[30px] border border-black/12 bg-white p-6 shadow-soft",
        className
      ].join(" ")}
    >
      {children}
    </div>
  );
}

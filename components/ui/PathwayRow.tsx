export type PathwayItem = {
  id: string;
  label: string;
  sequence: number;
  status: "complete" | "active" | "pending";
};

export function PathwayRow({ items }: { items: PathwayItem[] }) {
  return (
    <ol className="lc-pathway">
      {items.map((item, i) => (
        <li key={item.id} className="contents">
          <div className={`lc-pathway-node ${item.status !== "pending" ? item.status : ""}`}>
            <span className="lc-pathway-dot">{item.sequence}</span>
            <span className="mt-2 text-xs">{item.label}</span>
          </div>
          {i < items.length - 1 && <div className="lc-pathway-connector" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

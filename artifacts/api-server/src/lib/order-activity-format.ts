export type OrderActivityEvent = {
  id: string;
  type: string;
  label: string;
  actorType: string;
  actorName: string | null;
  detail: string | null;
  createdAt: string;
  synthetic?: boolean;
};

export function serializeActivityRow(row: {
  id: number;
  type: string;
  label: string;
  actorType: string;
  actorName: string | null;
  detail: string | null;
  createdAt: Date;
}): OrderActivityEvent {
  return {
    id: String(row.id),
    type: row.type,
    label: row.label,
    actorType: row.actorType,
    actorName: row.actorName,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mergeSyntheticCreated(
  events: OrderActivityEvent[],
  createdAt: Date | string | null | undefined,
): OrderActivityEvent[] {
  const hasCreated = events.some((event) => event.type === "created");
  if (hasCreated || !createdAt) return events;

  const at = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(at.getTime())) return events;

  return [
    ...events,
    {
      id: "synthetic-created",
      type: "created",
      label: "Pedido criado",
      actorType: "system",
      actorName: null,
      detail: null,
      createdAt: at.toISOString(),
      synthetic: true,
    },
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

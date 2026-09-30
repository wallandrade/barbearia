import { readOrderVariantChoices } from "@/lib/product-variants";

export function OrderVariantChoices({ raw }: { raw: unknown }) {
  const choices = readOrderVariantChoices(raw);
  if (choices.length === 0) return null;
  const manyGroups = new Set(choices.map((choice) => choice.groupName)).size > 1;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {choices.map((choice) => (
        <span
          key={`${choice.groupName}:${choice.option}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white py-0.5 pr-2 text-xs font-medium text-foreground"
          title={choice.groupName}
        >
          {choice.image ? (
            <img src={choice.image} alt="" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <span className="h-8 w-8 rounded-md bg-muted" />
          )}
          <span className="pr-0.5">
            {manyGroups ? <span className="block text-[10px] font-normal text-muted-foreground">{choice.groupName}</span> : null}
            {choice.option}
          </span>
        </span>
      ))}
    </div>
  );
}

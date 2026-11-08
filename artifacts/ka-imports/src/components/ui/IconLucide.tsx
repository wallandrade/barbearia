import * as Icons from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import React from "react";

const validIcons = new Set(Object.keys(Icons));

function isLucideIcon(value: unknown): value is LucideIcon {
  return typeof value === "function";
}

export function IconLucide({ name, ...props }: { name?: string } & LucideProps) {
  let iconName = typeof name === "string" && name ? name : "HelpCircle";
  if (!validIcons.has(iconName)) iconName = "HelpCircle";
  const candidate = Icons[iconName as keyof typeof Icons];
  const LucideIcon = isLucideIcon(candidate) ? candidate : Icons.HelpCircle;
  return <LucideIcon {...props} />;
}

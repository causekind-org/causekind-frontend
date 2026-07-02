import { Badge } from "causekind-next";

export function Default() {
  return <Badge>Verified</Badge>;
}

export function Secondary() {
  return <Badge variant="secondary">Draft</Badge>;
}

export function Destructive() {
  return <Badge variant="destructive">Rejected</Badge>;
}

export function Outline() {
  return <Badge variant="outline">Pending review</Badge>;
}

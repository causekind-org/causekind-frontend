import { Progress } from "causekind-next";

export function EarlyFunding() {
  return (
    <div className="w-72">
      <Progress value={24} />
    </div>
  );
}

export function NearlyFunded() {
  return (
    <div className="w-72">
      <Progress value={82} />
    </div>
  );
}

export function Complete() {
  return (
    <div className="w-72">
      <Progress value={100} />
    </div>
  );
}

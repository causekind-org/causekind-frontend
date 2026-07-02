import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "causekind-next";

const CATEGORIES = ["Clothing", "Books", "Electronics", "Furniture", "Toys"];

export function Default() {
  return (
    <Select defaultValue="Books">
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Placeholder() {
  return (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select subcategory" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Disabled() {
  return (
    <Select disabled>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select subcategory" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

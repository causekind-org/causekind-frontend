import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  Button,
  Badge,
} from "causekind-next";

export function CampaignSummary() {
  return (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Clean Water for Rural Schools</CardTitle>
        <CardDescription>
          Providing safe drinking water access to 12 schools in need.
        </CardDescription>
        <CardAction>
          <Badge>Active</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          ₹1,84,000 raised of ₹2,50,000 goal · 214 donors
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="w-full">Donate now</Button>
      </CardFooter>
    </Card>
  );
}

export function Simple() {
  return (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <CardDescription>Update your account details.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Manage your name, email, and notification preferences.
        </p>
      </CardContent>
    </Card>
  );
}

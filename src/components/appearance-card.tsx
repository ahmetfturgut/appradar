import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ThemeSelector } from "./theme-selector";

/** Account › Appearance. Same store as the header selector; stored only in this browser. */
export function AppearanceCard() {
  return <Card>
    <CardHeader className="border-b"><CardTitle role="heading" aria-level={2}>Appearance</CardTitle><CardDescription>Choose how AppRadar looks in this browser. System follows your device setting. Saved in this browser only.</CardDescription></CardHeader>
    <CardContent className="py-4"><ThemeSelector variant="full" /></CardContent>
  </Card>;
}

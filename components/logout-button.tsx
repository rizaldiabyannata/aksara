import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" className="h-11 px-4">
        Keluar
      </Button>
    </form>
  );
}

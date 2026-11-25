import { CardScene } from "@/features/gifts/components/card-scene";
import { CssCard } from "@/features/gifts/components/css-card";
import { PasswordForm } from "@/features/gifts/components/password-form";
import { useCardSize } from "@/features/gifts/lib/layout";
import { unseal, type StoredGift } from "@/features/gifts/lib/seal";
import type { Gift } from "@/features/gifts/types";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

// A reload reopens without the gate, and a link may carry the password in its #fragment,
// which browsers never send to the server.
function savedPasswords(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  return [
    decodeURIComponent(window.location.hash.slice(1)),
    sessionStorage.getItem(storageKey) ?? "",
  ].filter(Boolean);
}

// The room's light comes from above and to the left, a little different on each visit:
// its direction across the table, in degrees (counter-clockwise from the right).
function randomLightAngle(): number {
  return 115 + Math.random() * 45;
}

export function GiftPage({
  sealed,
  storageKey,
  year,
}: {
  sealed: StoredGift;
  storageKey: string;
  year: string;
}) {
  const size = useCardSize();
  const [gift, setGift] = useState<Gift | null>(null);
  const [lightAngle] = useState(randomLightAngle);
  const [webgl, setWebgl] = useState(true);
  // While a saved password is being checked the field stays hidden, so a returning
  // visitor never sees it flash up and vanish.
  const [resuming, setResuming] = useState(() => savedPasswords(storageKey).length > 0);

  async function tryUnseal(password: string): Promise<boolean> {
    const opened = await unseal<Gift>(sealed, password);
    if (!opened) return false;
    sessionStorage.setItem(storageKey, password);
    setGift(opened);
    return true;
  }

  useEffect(() => {
    const candidates = savedPasswords(storageKey);
    let cancelled = false;
    void Promise.all(candidates.map((candidate) => unseal<Gift>(sealed, candidate))).then(
      (results) => {
        if (cancelled) return;
        const index = results.findIndex(Boolean);
        if (index !== -1) {
          sessionStorage.setItem(storageKey, candidates[index]);
          setGift(results[index]);
        }
        setResuming(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sealed, storageKey]);

  if (!size) return <div className="fixed inset-0 bg-primary" />;

  const password = (
    <AnimatePresence>
      {gift || resuming ? null : (
        <motion.div
          key="password"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <PasswordForm onUnseal={tryUnseal} aside={size.aside} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const card = { size, cover: sealed.cover, gift, year };
  return (
    <div className="fixed inset-0 overflow-hidden bg-primary">
      {webgl ? (
        <CardScene {...card} lightAngle={lightAngle} onUnsupported={() => setWebgl(false)}>
          {password}
        </CardScene>
      ) : (
        <CssCard {...card}>{password}</CssCard>
      )}
    </div>
  );
}

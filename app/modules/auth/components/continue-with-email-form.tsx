import React from "react";
import { useLoaderData } from "@remix-run/react";
import Input from "~/components/forms/input";
import { Button } from "~/components/shared/button";

import { useTypedFetcher } from "~/hooks/use-fetcher";
import type { action } from "~/routes/_auth+/send-magic-link";

export function ContinueWithEmailForm() {
  const ref = React.useRef<HTMLFormElement>(null);
  const { isResend } = useLoaderData();

  const sendMagicLink = useTypedFetcher<typeof action>();
  const { data, state, type } = sendMagicLink;
  const isSuccessFull = type === "done" && !data?.error;
  const isLoading = state === "submitting" || state === "loading";
  const buttonLabel = isLoading
    ? "Sending you a link..."
    : isResend
    ? "Resend confirmation email"
    : "Continue with Magic Link";

  React.useEffect(() => {
    if (isSuccessFull) {
      ref.current?.reset();
    }
  }, [isSuccessFull]);

  return (
    <sendMagicLink.Form
      method="post"
      action="/send-magic-link"
      replace={false}
      ref={ref}
    >
      <Input
        label="Magic link"
        hideLabel={true}
        type="email"
        name="email"
        id="magic-link"
        inputClassName="w-full"
        placeholder="zaans@huisje.com"
        disabled={isLoading}
        error={data?.error || ""}
      />

      <Button
        type="submit"
        disabled={isLoading}
        width="full"
        variant="secondary"
        className="mt-3"
      >
        {buttonLabel}
      </Button>

      {isSuccessFull && (
        <div className={`mb-2 h-6 text-center text-green-600`}>
          Check your emails
        </div>
      )}
    </sendMagicLink.Form>
  );
}

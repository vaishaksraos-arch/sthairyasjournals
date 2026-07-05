import { forwardRef, useImperativeHandle, useRef } from "react";

export type SecurePasswordHandle = {
  getValue: () => string;
  clear: () => void;
  focus: () => void;
};

/**
 * Uncontrolled password input — value is NEVER bound to the React `value`
 * prop, so it does not appear in serialized DOM attributes. Contents live
 * only in the DOM input's internal .value property (not reflected as an HTML
 * attribute) and are readable via ref.getValue().
 */
export const SecurePasswordInput = forwardRef<
  SecurePasswordHandle,
  {
    name?: string;
    required?: boolean;
    minLength?: number;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    autoComplete?: string;
    onEnter?: () => void;
  }
>(function SecurePasswordInput(
  { name, required, minLength, placeholder, className, autoFocus, autoComplete = "new-password", onEnter },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => inputRef.current?.value ?? "",
    clear: () => { if (inputRef.current) inputRef.current.value = ""; },
    focus: () => inputRef.current?.focus(),
  }), []);

  return (
    <input
      ref={inputRef}
      type="password"
      name={name}
      required={required}
      minLength={minLength}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-lpignore="true"
      data-1p-ignore="true"
      className={className}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }}
    />
  );
});

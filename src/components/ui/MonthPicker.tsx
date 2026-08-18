"use client";
import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function MonthPicker({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <input
      type="month"
      name="month"
      defaultValue={defaultValue}
      className="form-input"
      style={{ maxWidth: 200 }}
      onChange={handleChange}
    />
  );
}

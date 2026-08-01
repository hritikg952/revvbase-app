"use client";

import { AuthRequired } from "@/components/auth-required";
import { ListingForm } from "@/components/listing-form";

export default function SellPage() {
  return (
    <div className="shell page-section narrow">
      <AuthRequired>
        <div className="page-heading">
          <p className="eyebrow">Create a listing</p>
          <h1>Tell the next owner about your ride.</h1>
          <p>Share the essentials. You can leave the image blank and use our stock placeholder.</p>
        </div>
        <ListingForm />
      </AuthRequired>
    </div>
  );
}

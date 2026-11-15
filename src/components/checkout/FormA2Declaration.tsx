import { COMPLIANCE } from "@/config/compliance";
import { purposeLabel } from "@/data/purposes";

/** DECL-1: Form A2 cum LRS declaration (rendered as a scrollable declaration). Draft wording - to be reviewed. */
export function FormA2Declaration({ purposeCode }: { purposeCode: string }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Form A2 cum LRS declaration"
      className="max-h-56 overflow-y-auto rounded-xl border border-line bg-bg p-4 text-sm leading-relaxed text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
      data-testid="form-a2"
    >
      <p className="font-semibold text-ink">Form A2 cum declaration under the Liberalised Remittance Scheme (LRS)</p>
      <p className="mt-2">I, the applicant named in this application, hereby declare that:</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          The foreign exchange is being drawn for the purpose of <strong className="text-ink">{purposeLabel(purposeCode)}</strong> and will be used only for that purpose.
        </li>
        <li>The source of funds is my own, and the rupee payment is made from my own bank account or card.</li>
        <li>
          The total amount of foreign exchange purchased / remitted by me under the LRS during the current financial year (April–March), including this
          application, through all Authorised Persons, does not exceed USD {COMPLIANCE.lrsLimitUsd.toLocaleString("en-IN")}, and the amount declared above is
          true and complete.
        </li>
        <li>
          The foreign exchange will not be used for any purpose prohibited under the Foreign Exchange Management Act, 1999, including margin trading,
          lottery, banned magazines, sweepstakes, racing / gambling, or remittances to countries identified as non-co-operative.
        </li>
        <li>
          I will surrender any unused foreign exchange to an Authorised Person within the period stipulated by the Reserve Bank of India, and I may retain
          only the amount permitted.
        </li>
        <li>I am not on any list of persons prohibited from undertaking foreign exchange transactions, and I am not a minor.</li>
        <li>
          I understand that applicable TCS will be collected under the Income-tax Act where my aggregate LRS remittances in the financial year exceed the
          prescribed threshold, and that the information furnished may be shared with regulators and tax authorities.
        </li>
      </ol>
      <p className="mt-3">
        I certify that the information given is correct. I understand that a false declaration may lead to action under FEMA, 1999.
      </p>
      <p className="mt-3 text-xs italic">Draft wording - to be reviewed by the compliance officer before go-live.</p>
    </div>
  );
}

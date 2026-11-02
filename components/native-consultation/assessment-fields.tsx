"use client";
import type { ReactNode, RefObject } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { MOTIVATIONS, type Motivation } from "@solortide/consultation-core";
import { emailSuggestion } from "@/lib/native-consultation/schema";
import type { FormValues } from "@/lib/native-consultation/draft";
import { PhoneField } from "./phone-field";
import { ProfileField } from "./profile-field";
import { MonthlyUseField } from "./monthly-use-field";
import { AddressField } from "./address-field";
import { RequiredMark } from "./required-mark";
import styles from "./form.module.css";
export function AssessmentFields({form,step,errors,onBlur,onBack,headingRef,children}:{form:UseFormReturn<FormValues>;step:0|1;errors:Record<string,string>;onBlur:(key:string)=>void;onBack:()=>void;headingRef:RefObject<HTMLHeadingElement|null>;children?:ReactNode}) {
  const values=form.watch();
  const suggestion = emailSuggestion(values.email);
  const field = (name: "name" | "email", label: string, type = "text", autoComplete?: string) => <div className={styles.field}>
    <label htmlFor={name}>{label}<RequiredMark /></label>
    <input {...form.register(name)} id={name} type={type} required autoComplete={autoComplete}
      maxLength={name === "name" ? 160 : 254} onBlur={() => onBlur(name)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />
    {errors[name] && <p id={`${name}-error`} className={styles.error}>{errors[name]}</p>}
  </div>;
  return <div className={styles.stepBody} key={step}>
              <div className={styles.sectionHeading}>
                <h1 ref={headingRef} tabIndex={-1}>{step === 0 ? "Contact details" : "Electricity use"}</h1>
                {step === 1 && <button type="button" className={styles.back} onClick={() => onBack()}><ArrowLeft size={16} />Back</button>}
              </div>
              {step === 0 ? <>
                {field("name", "Full name", "text", "name")}
                <div>
                  <div>{field("email", "Email address", "email", "email")}{suggestion && <button className={styles.suggestion} type="button" onClick={() => form.setValue("email", suggestion)}>Use {suggestion}?</button>}</div>
                  <div className={styles.field}>
                    <label htmlFor="phone">Phone number<RequiredMark /></label>
                    <Controller name="phone" control={form.control} render={({ field: f }) => <PhoneField value={f.value} country={values.phoneCountry} onChange={f.onChange} onCountryChange={c => form.setValue("phoneCountry", c)} onBlur={() => onBlur("phone")} error={errors.phone} />} />
                    {errors.phone && <p className={styles.error} id="phone-error">{errors.phone}</p>}
                  </div>
                </div>
                <AddressField {...form.register("address")} onBlur={() => onBlur("address")} error={errors.address} />
              </> : <>
                <MonthlyUseField {...form.register("monthlyKwh")} onBlur={() => onBlur("monthlyKwh")} error={errors.monthlyKwh} />
                <ProfileField value={values.profile} onChange={p => { form.setValue("profile", p); }} error={errors.profile} />
                <details id="property-details" className={styles.additional}>
                  <summary>
                    <span className={styles.questionTitle}><span className={styles.questionNumber} aria-hidden="true">03</span><span>Property details <span className={styles.optional}>(Optional)</span></span></span>
                    <ChevronDown size={18} aria-hidden="true" className={styles.additionalChevron} />
                  </summary>
                  <div className={styles.additionalBody}>
                    <div className={styles.propertyQuestion}>
                      <fieldset className={styles.motivations}>
                        <legend><span className={styles.subQuestionTitle}><span className={styles.subQuestionNumber} aria-hidden="true">3.1</span><span>What matters most to you?</span></span></legend>
                        {(Object.keys(MOTIVATIONS) as Motivation[]).map(key => <label key={key}><input type="checkbox" value={key} {...form.register("answers.motivations")} />{MOTIVATIONS[key][0]}</label>)}
                      </fieldset>
                      {values.answers.motivations.includes("other") && <label className={styles.field}>Other priorities<textarea {...form.register("answers.otherMotivation")} maxLength={1000} /></label>}
                    </div>
                    <div className={`${styles.field} ${styles.propertyQuestion}`}>
                      <div className={styles.subQuestionTitle}><span className={styles.subQuestionNumber} aria-hidden="true">3.2</span><label htmlFor="airConditioning">Air conditioning</label></div>
                      <textarea id="airConditioning" {...form.register("answers.airConditioning")} maxLength={1500} placeholder="Number of units and when you use them" />
                    </div>
                    <div className={`${styles.field} ${styles.propertyQuestion}`}>
                      <div className={styles.subQuestionTitle}><span className={styles.subQuestionNumber} aria-hidden="true">3.3</span><label htmlFor="wifi">Wi-Fi available at the property</label></div>
                      <select id="wifi" {...form.register("answers.wifi")}><option value="">Choose an option</option><option value="yes">Yes</option><option value="no">No</option></select>
                    </div>
                    <div className={`${styles.field} ${styles.propertyQuestion}`}>
                      <div className={styles.subQuestionTitle}><span className={styles.subQuestionNumber} aria-hidden="true">3.4</span><label htmlFor="otherAppliances">Other major appliances</label></div>
                      <textarea id="otherAppliances" {...form.register("answers.otherAppliances")} maxLength={1500} placeholder="For example, a stove or water heater" />
                    </div>
                  </div>
                </details>
                {children}
              </>}
            </div>;
}

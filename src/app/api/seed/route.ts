import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const SEED_SECRET = process.env.SEED_SECRET || "seed-dev-only";

const QUESTIONS = [
  {
    question_text:
      "Insurance acts as a risk transfer mechanism. Which type of risk does insurance primarily cover?",
    options: [
      { label: "A", text: "Speculative risk — where there is a chance of profit or loss" },
      { label: "B", text: "Pure risk — where there is only a chance of loss or no loss" },
      { label: "C", text: "Fundamental risk — affecting the entire economy" },
      { label: "D", text: "Financial risk — related to stock market investments" },
    ],
    correct_option: "B",
    sort_order: 1,
  },
  {
    question_text:
      "The Law of Large Numbers allows insurers to:",
    options: [
      { label: "A", text: "Eliminate all risk from their portfolio" },
      { label: "B", text: "Accurately predict losses for individual policyholders" },
      { label: "C", text: "More accurately predict future losses for large groups of similar risks" },
      { label: "D", text: "Guarantee profits on every policy written" },
    ],
    correct_option: "C",
    sort_order: 2,
  },
  {
    question_text:
      "An insured fails to lock their car in a busy parking lot reasoning 'if it's stolen, I have insurance.' This is an example of which type of hazard?",
    options: [
      { label: "A", text: "Physical hazard" },
      { label: "B", text: "Moral hazard" },
      { label: "C", text: "Morale hazard" },
      { label: "D", text: "Legal hazard" },
    ],
    correct_option: "C",
    sort_order: 3,
  },
  {
    question_text:
      "John insured his house with ABC Insurance for $200,000. A fire destroyed the house. ABC will rebuild the house to its pre-loss condition but will not build a larger or more elaborate house. Which principle of insurance is being applied?",
    options: [
      { label: "A", text: "Utmost Good Faith" },
      { label: "B", text: "Subrogation" },
      { label: "C", text: "Indemnity" },
      { label: "D", text: "Contribution" },
    ],
    correct_option: "C",
    sort_order: 4,
  },
  {
    question_text:
      "After paying a claim, the insurer becomes entitled to recover the claim amount from the third party responsible for the loss. This principle is known as:",
    options: [
      { label: "A", text: "Contribution" },
      { label: "B", text: "Subrogation" },
      { label: "C", text: "Proximate Cause" },
      { label: "D", text: "Indemnity" },
    ],
    correct_option: "B",
    sort_order: 5,
  },
  {
    question_text:
      "John took a health insurance policy but did not disclose that he was a smoker at the time of purchase. He later filed a claim for cancer treatment. The insurer can deny the claim based on which principle?",
    options: [
      { label: "A", text: "Indemnity" },
      { label: "B", text: "Insurable Interest" },
      { label: "C", text: "Utmost Good Faith" },
      { label: "D", text: "Loss Minimization" },
    ],
    correct_option: "C",
    sort_order: 6,
  },
  {
    question_text:
      "What is the primary purpose of the underwriting function in insurance?",
    options: [
      { label: "A", text: "To process claims as quickly as possible" },
      { label: "B", text: "To sell the maximum number of policies" },
      { label: "C", text: "To determine risks, decide acceptability, and set appropriate premiums" },
      { label: "D", text: "To invest the company's surplus funds" },
    ],
    correct_option: "C",
    sort_order: 7,
  },
  {
    question_text:
      "A Field (Line) Underwriter's responsibilities include all of the following EXCEPT:",
    options: [
      { label: "A", text: "Evaluating individual insurance applications" },
      { label: "B", text: "Formulating overall underwriting policy for the company" },
      { label: "C", text: "Ensuring accurate classification and pricing" },
      { label: "D", text: "Managing their own book of business" },
    ],
    correct_option: "B",
    sort_order: 8,
  },
  {
    question_text:
      "In the insurance policy lifecycle, what is a binder?",
    options: [
      { label: "A", text: "A permanent insurance policy document" },
      { label: "B", text: "A temporary agreement providing coverage until the written policy is issued" },
      { label: "C", text: "A cancellation notice sent to the insured" },
      { label: "D", text: "A claim settlement document" },
    ],
    correct_option: "B",
    sort_order: 9,
  },
  {
    question_text:
      "Which of the following is NOT a type of policy transaction in the insurance lifecycle?",
    options: [
      { label: "A", text: "Endorsement" },
      { label: "B", text: "Cancellation" },
      { label: "C", text: "Arbitration" },
      { label: "D", text: "Renewal" },
    ],
    correct_option: "C",
    sort_order: 10,
  },
  {
    question_text:
      "The primary goal of ratemaking is to:",
    options: [
      { label: "A", text: "Maximize premiums collected from policyholders" },
      { label: "B", text: "Develop rates that enable the insurer to compete effectively while earning a reasonable profit" },
      { label: "C", text: "Minimize the number of claims filed" },
      { label: "D", text: "Set rates lower than all competitors" },
    ],
    correct_option: "B",
    sort_order: 11,
  },
  {
    question_text:
      "Class rating is best described as:",
    options: [
      { label: "A", text: "A rating approach using rates that reflect individual loss history" },
      { label: "B", text: "A rating approach using rates reflecting average probability of loss for large groups of similar risks" },
      { label: "C", text: "A rating method based solely on underwriter judgment" },
      { label: "D", text: "A method that only applies to personal insurance lines" },
    ],
    correct_option: "B",
    sort_order: 12,
  },
  {
    question_text:
      "Experience rating uses actual losses from prior policy periods (typically 3 years) compared to the class average. Which factor determines how much the premium is adjusted?",
    options: [
      { label: "A", text: "The number of employees" },
      { label: "B", text: "The credibility factor, largely determined by the size of the business" },
      { label: "C", text: "The geographic location of the business only" },
      { label: "D", text: "The insurer's total investment income" },
    ],
    correct_option: "B",
    sort_order: 13,
  },
  {
    question_text:
      "Alliance Safety Products carries Product Liability Insurance with an Aggregate limit of $2,000,000 and a Per Occurrence limit of $1,000,000. They face three separate lawsuits of $1,000,000 each in one policy period. How much will the insurer pay in total?",
    options: [
      { label: "A", text: "$3,000,000 — the per occurrence limit covers each claim" },
      { label: "B", text: "$2,000,000 — limited by the aggregate, so the third claim is unpaid" },
      { label: "C", text: "$1,000,000 — only the first claim is covered" },
      { label: "D", text: "$2,500,000 — a blended limit applies" },
    ],
    correct_option: "B",
    sort_order: 14,
  },
  {
    question_text:
      "What is the key difference between a Deductible and a Self-Insured Retention (SIR)?",
    options: [
      { label: "A", text: "A deductible is always higher than an SIR" },
      { label: "B", text: "With a deductible the insurer pays first then bills the insured; with SIR the insured pays first before the insurer steps in" },
      { label: "C", text: "SIR erodes the policy limit but a deductible does not" },
      { label: "D", text: "There is no practical difference between the two" },
    ],
    correct_option: "B",
    sort_order: 15,
  },
  {
    question_text:
      "CGL Coverage A covers which of the following?",
    options: [
      { label: "A", text: "Personal and advertising injury" },
      { label: "B", text: "Bodily injury and property damage liability" },
      { label: "C", text: "Medical payments" },
      { label: "D", text: "Workers' compensation" },
    ],
    correct_option: "B",
    sort_order: 16,
  },
  {
    question_text:
      "CGL Coverage B provides protection against claims related to:",
    options: [
      { label: "A", text: "Bodily injury from premises operations" },
      { label: "B", text: "Personal injury and advertising injury such as slander, libel, and false arrest" },
      { label: "C", text: "Product liability claims" },
      { label: "D", text: "Automobile liability claims" },
    ],
    correct_option: "B",
    sort_order: 17,
  },
  {
    question_text:
      "Under an Occurrence-based CGL policy, a covered incident occurs on December 7, 2009 during the policy period (Jan 1 - Dec 31, 2009), but the claim is reported on January 12, 2010. Will the policy respond?",
    options: [
      { label: "A", text: "No — the claim must be reported during the policy period" },
      { label: "B", text: "Yes — coverage applies because the incident occurred during the policy period, regardless of when the claim is filed" },
      { label: "C", text: "Only if the insured purchases tail coverage" },
      { label: "D", text: "Only if the insured renews the policy for 2010" },
    ],
    correct_option: "B",
    sort_order: 18,
  },
  {
    question_text:
      "An excess liability policy differs from the underlying primary policy in that it:",
    options: [
      { label: "A", text: "Provides broader coverage than the primary policy" },
      { label: "B", text: "Provides additional limits above the primary policy without broadening coverage" },
      { label: "C", text: "Replaces the primary policy entirely" },
      { label: "D", text: "Covers only workers' compensation claims" },
    ],
    correct_option: "B",
    sort_order: 19,
  },
  {
    question_text:
      "What is the key difference between an Excess Liability policy and an Umbrella Liability policy?",
    options: [
      { label: "A", text: "They are identical — the terms are interchangeable" },
      { label: "B", text: "An umbrella policy may cover some claims not covered by the underlying primary policies; an excess policy does not broaden coverage" },
      { label: "C", text: "An excess policy provides broader coverage than an umbrella" },
      { label: "D", text: "An umbrella policy only covers auto liability" },
    ],
    correct_option: "B",
    sort_order: 20,
  },
];

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // 1. Create admin user
    const { data: adminUser, error: adminError } =
      await admin.auth.admin.createUser({
        email: "admin@examplatform.com",
        password: "admin123456",
        email_confirm: true,
        user_metadata: { full_name: "Admin User", role: "admin" },
      });
    if (adminError && !adminError.message.includes("already been registered")) {
      throw adminError;
    }

    // 2. Create test candidates
    const candidates = [
      {
        email: "alice@example.com",
        password: "candidate123",
        full_name: "Alice Johnson",
      },
      {
        email: "bob@example.com",
        password: "candidate123",
        full_name: "Bob Smith",
      },
    ];

    for (const c of candidates) {
      const { error } = await admin.auth.admin.createUser({
        email: c.email,
        password: c.password,
        email_confirm: true,
        user_metadata: { full_name: c.full_name, role: "candidate" },
      });
      if (error && !error.message.includes("already been registered")) {
        throw error;
      }
    }

    // 3. Get admin profile ID
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .single();

    if (!adminProfile) throw new Error("Admin profile not found");

    // 4. Create the exam
    const { data: exam, error: examError } = await admin
      .from("exams")
      .insert({
        title: "Insurance Fundamentals — Comprehensive Assessment",
        description:
          "A 20-question assessment covering insurance concepts, principles, underwriting, policy lifecycle, ratemaking, limits, deductibles, CGL, and excess/umbrella insurance.",
        time_limit_minutes: 30,
        max_attempts: 2,
        is_live: false,
        created_by: adminProfile.id,
      })
      .select("id, title")
      .single();

    if (examError) throw examError;

    // 5. Insert questions
    const questionsWithExamId = QUESTIONS.map((q) => ({
      ...q,
      exam_id: exam.id,
    }));

    const { error: questionsError } = await admin
      .from("questions")
      .insert(questionsWithExamId);

    if (questionsError) throw questionsError;

    return NextResponse.json({
      success: true,
      message: "Seed complete",
      admin: { email: "admin@examplatform.com", password: "admin123456" },
      candidates: candidates.map((c) => ({
        email: c.email,
        password: c.password,
      })),
      exam: { id: exam.id, title: exam.title, questions: QUESTIONS.length },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Seed failed" },
      { status: 500 }
    );
  }
}

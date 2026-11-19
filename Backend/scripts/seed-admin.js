import "dotenv/config";
import mysql from "mysql2/promise";
import { getAdminSeed, getDatabaseConfig } from "../src/config.js";
import { hashPassword } from "../src/auth/password.js";
import { schemeCatalog } from "./scheme-catalog.js";

const educationSchemes = [
  {
    code: "PM-USP-CSSS",
    name: "Central Sector Scheme of Scholarship for College and University Students",
    details: {
      format: "paragraphs",
      items: [
        "The scheme provides financial assistance to meritorious students from families with limited income so they can pursue regular undergraduate and postgraduate studies.",
        "Applicants are selected based on their Class XII results and must apply through the National Scholarship Portal during its announced application period. Awards and renewal are governed by the current scheme guidelines.",
        "Verify current eligibility, award rates, and application dates with the Ministry of Education and National Scholarship Portal: https://www.education.gov.in/ and https://scholarships.gov.in/."
      ]
    },
    benefits: {
      format: "bullets",
      items: [
        "Scholarship support is provided for eligible regular college or university study.",
        "The published rate is generally ₹12,000 per year for the first three years of undergraduate study and ₹20,000 per year for later eligible years, including postgraduate or integrated-course years as specified in the guidelines.",
        "Renewal is subject to the scheme's academic-performance, attendance, and continued-eligibility requirements."
      ]
    },
    eligibility: {
      format: "bullets",
      items: [
        "The student must be above the 80th percentile of successful candidates in the relevant stream in their Class XII board examination.",
        "The student must be enrolled in a regular degree course at a recognized college or university; correspondence, distance-learning, and diploma courses are not covered.",
        "The family's annual income from all sources must not exceed ₹4.5 lakh.",
        "The student must not receive another scholarship or fee-reimbursement benefit for the same course.",
        "Renewal requires meeting the current guidelines' minimum marks and attendance conditions."
      ]
    },
    documents: {
      format: "list",
      items: [
        "Class XII marksheet and board examination details.",
        "Proof of admission and current enrolment in a regular course.",
        "Family income certificate issued by the competent authority.",
        "Aadhaar or other identity document accepted by the portal.",
        "Bank account details in the student's name, as required by the portal.",
        "Additional documents requested by the institution or current application guidelines."
      ]
    },
    applicationProcess: {
      online: {
        enabled: true,
        subsections: [{
          title: "Apply through the National Scholarship Portal",
          format: "steps",
          steps: [
            "Check the Ministry of Education scheme guidelines and current application dates at https://www.education.gov.in/ and https://scholarships.gov.in/.",
            "Register or sign in to the National Scholarship Portal and complete the scholarship application.",
            "Enter academic, income, identity, and bank details, then upload the documents requested by the portal.",
            "Submit the application and complete any verification requested by the institution or state authority.",
            "Track the application and renewal status on the portal."
          ]
        }]
      },
      offline: { enabled: false, subsections: [] }
    }
  },
  {
    code: "NMMSS",
    name: "National Means-cum-Merit Scholarship Scheme",
    details: {
      format: "paragraphs",
      items: [
        "The scheme provides scholarships to meritorious students from economically weaker families to help reduce dropouts after Class VIII and support continued study through secondary and higher secondary school.",
        "States and union territories conduct the selection examination. Selected students apply for the award and its renewals through the National Scholarship Portal.",
        "Verify the current scheme guidelines and application dates with the Ministry of Education, the relevant state or union-territory education department, and the National Scholarship Portal: https://www.education.gov.in/ and https://scholarships.gov.in/."
      ]
    },
    benefits: {
      format: "bullets",
      items: [
        "A scholarship of ₹12,000 per year is provided from Class IX through Class XII, subject to eligibility and renewal.",
        "The award supports continued school education and is disbursed according to the current scheme and portal guidelines."
      ]
    },
    eligibility: {
      format: "bullets",
      items: [
        "The student must be studying in Class VIII at a government, government-aided, or local-body school covered by the scheme.",
        "The family's annual income from all sources must not exceed ₹3.5 lakh.",
        "Selection is through the state or union-territory examination; the student must satisfy the academic requirements specified for that examination.",
        "Students of schools excluded by the current guidelines, including Kendriya Vidyalayas and Jawahar Navodaya Vidyalayas, are not eligible.",
        "Continuation in Classes IX to XII requires meeting the prescribed promotion and academic-performance conditions."
      ]
    },
    documents: {
      format: "list",
      items: [
        "Class VII and Class VIII marksheets or school records.",
        "Selection examination result or certificate issued by the state or union territory.",
        "Family income certificate issued by the competent authority.",
        "School enrolment or bonafide certificate.",
        "Aadhaar or other identity document accepted by the portal.",
        "Bank account details and any additional documents requested by the school or portal."
      ]
    },
    applicationProcess: {
      online: {
        enabled: true,
        subsections: [{
          title: "Selection and scholarship application",
          format: "steps",
          steps: [
            "Check the state or union-territory education department's NMMSS examination notice and the Ministry of Education's current eligibility conditions at https://www.education.gov.in/.",
            "Apply for and take the state or union-territory selection examination through the notified process.",
            "If selected, register or sign in at scholarships.gov.in and submit the scholarship application with the requested school, income, and bank details.",
            "Have the application verified by the school and other authorities specified by the portal.",
            "Submit renewals on time and track their status through the portal."
          ]
        }]
      },
      offline: { enabled: false, subsections: [] }
    }
  },
  {
    code: "AICTE-PRAGATI",
    name: "AICTE Pragati Scholarship Scheme for Girl Students",
    details: {
      format: "paragraphs",
      items: [
        "The AICTE Pragati scheme supports girls pursuing an AICTE-approved technical diploma or degree. Applications are submitted through the National Scholarship Portal when the scheme is open.",
        "The award is available for the prescribed duration of the eligible course and is subject to the current AICTE guidelines and renewal requirements.",
        "Verify current eligibility, award terms, and application dates with AICTE and the National Scholarship Portal: https://www.aicte-india.org/ and https://scholarships.gov.in/."
      ]
    },
    benefits: {
      format: "bullets",
      items: [
        "Scholarship assistance of up to ₹50,000 per year is available for eligible students.",
        "Support may be provided for up to four years for a degree course or three years for a diploma course, including eligible lateral-entry cases, as specified by AICTE.",
        "The number of awards and permitted uses of funds are governed by the current scheme guidelines."
      ]
    },
    eligibility: {
      format: "bullets",
      items: [
        "The applicant must be a girl student admitted to the first year of an AICTE-approved technical degree or diploma course, or the second year through lateral entry.",
        "No more than two girl children from one family may receive the scholarship under the scheme.",
        "The family's annual income from all sources must not exceed ₹8 lakh.",
        "The student must satisfy the current AICTE and National Scholarship Portal requirements and renewal conditions."
      ]
    },
    documents: {
      format: "list",
      items: [
        "Proof of admission to the AICTE-approved course and institution.",
        "Qualifying examination marksheet and applicable lateral-entry records.",
        "Family income certificate issued by the competent authority.",
        "Aadhaar or other identity document accepted by the portal.",
        "Bank account details in the student's name, as required by the portal.",
        "Declaration or supporting documents for the number of girl children in the family, if requested.",
        "Additional documents requested by AICTE or the current application guidelines."
      ]
    },
    applicationProcess: {
      online: {
        enabled: true,
        subsections: [{
          title: "Apply through the National Scholarship Portal",
          format: "steps",
          steps: [
            "Confirm that the course and institution meet the current AICTE Pragati guidelines.",
            "Check the AICTE guidelines and current application window and document list at https://www.aicte-india.org/ and https://scholarships.gov.in/.",
            "Register or sign in, select the AICTE Pragati scheme, and complete the application.",
            "Upload the requested admission, income, identity, and bank documents, then submit for institutional verification.",
            "Track the application and submit renewals through the portal when due."
          ]
        }]
      },
      offline: { enabled: false, subsections: [] }
    }
  },
  {
    code: "AICTE-SAKSHAM",
    name: "AICTE Saksham Scholarship Scheme for Specially-Abled Students",
    details: {
      format: "paragraphs",
      items: [
        "The AICTE Saksham scheme supports students with disabilities pursuing technical diploma or degree courses at AICTE-approved institutions.",
        "Applications are submitted through the National Scholarship Portal during its announced application period. Award duration, renewal, and admissible uses are governed by the current AICTE guidelines.",
        "Verify current eligibility, award terms, and application dates with AICTE and the National Scholarship Portal: https://www.aicte-india.org/ and https://scholarships.gov.in/."
      ]
    },
    benefits: {
      format: "bullets",
      items: [
        "Scholarship assistance of up to ₹50,000 per year is available for eligible students.",
        "Support may be provided for up to four years for a degree course or three years for a diploma course, including eligible lateral-entry cases, as specified by AICTE.",
        "The award is subject to the current scheme guidelines and renewal requirements."
      ]
    },
    eligibility: {
      format: "bullets",
      items: [
        "The applicant must have a disability of at least 40% and be admitted to the first year of an AICTE-approved technical degree or diploma course, or the second year through lateral entry.",
        "The family's annual income from all sources must not exceed ₹8 lakh.",
        "The student must satisfy the current AICTE and National Scholarship Portal requirements and renewal conditions."
      ]
    },
    documents: {
      format: "list",
      items: [
        "Disability certificate showing the required disability percentage, or the certificate accepted under current guidelines.",
        "Proof of admission to the AICTE-approved course and institution.",
        "Qualifying examination marksheet and applicable lateral-entry records.",
        "Family income certificate issued by the competent authority.",
        "Aadhaar or other identity document accepted by the portal.",
        "Bank account details in the student's name, as required by the portal.",
        "Additional documents requested by AICTE or the current application guidelines."
      ]
    },
    applicationProcess: {
      online: {
        enabled: true,
        subsections: [{
          title: "Apply through the National Scholarship Portal",
          format: "steps",
          steps: [
            "Confirm that the disability certification, course, and institution meet the current AICTE Saksham guidelines.",
            "Check the AICTE guidelines and current application window and document list at https://www.aicte-india.org/ and https://scholarships.gov.in/.",
            "Register or sign in, select the AICTE Saksham scheme, and complete the application.",
            "Upload the requested disability, admission, income, identity, and bank documents, then submit for institutional verification.",
            "Track the application and submit renewals through the portal when due."
          ]
        }]
      },
      offline: { enabled: false, subsections: [] }
    }
  },
  {
    code: "PM-VIDYALAXMI",
    name: "PM-Vidyalaxmi",
    details: {
      format: "paragraphs",
      items: [
        "PM-Vidyalaxmi is a unified portal for students to apply for education loans and applicable interest-subvention support for higher education.",
        "Education loans are offered by participating lenders. Availability, loan terms, institute eligibility, and any interest support depend on current scheme rules and lender assessment.",
        "Check the eligible-institute list, current guidelines, and application status on the official portal: https://pmvidyalaxmi.co.in/."
      ]
    },
    benefits: {
      format: "bullets",
      items: [
        "Provides a single online portal to apply for education loans offered by participating lenders.",
        "Eligible students may apply for interest-subvention support under the applicable scheme provisions.",
        "Loan approval, terms, and the availability or amount of interest support are subject to current guidelines and lender assessment."
      ]
    },
    eligibility: {
      format: "bullets",
      items: [
        "The student must meet the current PM-Vidyalaxmi requirements and be seeking higher education at an institution included in the scheme's eligible-institute list.",
        "Eligibility for a loan and for any interest-subvention support is assessed under the respective current scheme provisions; these may have different conditions.",
        "The lender may apply additional loan assessment requirements. Confirm current conditions on the official portal before applying."
      ]
    },
    documents: {
      format: "list",
      items: [
        "Proof of admission or offer of admission from the eligible higher-education institution.",
        "Identity and address documents accepted by the portal and participating lender.",
        "Academic records and fee details requested for the loan application.",
        "Income documents if applying for interest-subvention support.",
        "Banking details and any additional documents requested by the portal or lender."
      ]
    },
    applicationProcess: {
      online: {
        enabled: true,
        subsections: [{
          title: "Apply through the PM-Vidyalaxmi portal",
          format: "steps",
          steps: [
            "Visit https://pmvidyalaxmi.co.in/ and check the current scheme guidelines and eligible-institute list.",
            "Register or sign in and complete the education-loan application with the requested student and course information.",
            "Select a participating lender and submit the documents requested for its assessment.",
            "If eligible, apply for any interest-subvention support available under the current scheme provisions.",
            "Track the application and respond to requests from the lender or scheme authorities through the portal."
          ]
        }]
      },
      offline: { enabled: false, subsections: [] }
    }
  }
];

async function seedEducationSchemes(connection) {
  await connection.beginTransaction();
  try {
    await connection.execute(
      `INSERT INTO master_categories (name, description)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      ["Education", "Scholarships and other support for school, college, and technical education."]
    );

    const [categoryRows] = await connection.execute(
      "SELECT id FROM master_categories WHERE name = ? AND is_active = TRUE LIMIT 1",
      ["Education"]
    );
    if (categoryRows.length === 0) {
      throw new Error('The "Education" category exists but is inactive');
    }

    const [ministryRows] = await connection.execute(
      "SELECT id FROM master_ministry WHERE ministry = ? AND is_active = TRUE LIMIT 1",
      ["Ministry of Education (MoE)"]
    );
    if (ministryRows.length === 0) {
      throw new Error('The active "Ministry of Education (MoE)" record is unavailable; run migrations first');
    }

    const categoryId = categoryRows[0].id;
    const ministryId = ministryRows[0].id;
    const mappingTables = [
      "scheme_categories",
      "scheme_states",
      "scheme_union_territories",
      "scheme_genders",
      "scheme_criteria",
      "scheme_numeric_rule"
    ];

    for (const scheme of educationSchemes) {
      const [result] = await connection.execute(
        `INSERT INTO schemes
           (code, name, ministry_id, coverage_type, details, benefits, eligibility,
            application_process, documents)
         VALUES (?, ?, ?, 'ALL_INDIA', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           id = LAST_INSERT_ID(id),
           name = VALUES(name),
           ministry_id = VALUES(ministry_id),
           coverage_type = VALUES(coverage_type),
           details = VALUES(details),
           benefits = VALUES(benefits),
           eligibility = VALUES(eligibility),
           application_process = VALUES(application_process),
           documents = VALUES(documents),
           is_active = TRUE`,
        [
          scheme.code,
          scheme.name,
          ministryId,
          JSON.stringify(scheme.details),
          JSON.stringify(scheme.benefits),
          JSON.stringify(scheme.eligibility),
          JSON.stringify(scheme.applicationProcess),
          JSON.stringify(scheme.documents)
        ]
      );
      const schemeId = result.insertId;

      for (const table of mappingTables) {
        await connection.execute(`DELETE FROM ${table} WHERE scheme_id = ?`, [schemeId]);
      }
      await connection.execute(
        "INSERT INTO scheme_categories (scheme_id, category_id) VALUES (?, ?)",
        [schemeId, categoryId]
      );
    }

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Could not roll back education scheme seeding transaction", rollbackError);
    }
    throw error;
  }
}

async function seedCatalogSchemes(connection) {
  await connection.beginTransaction();
  try {
    const categoryNames = [...new Set(schemeCatalog.flatMap((scheme) => scheme.categories))];
    const ministryNames = [...new Set(schemeCatalog.map((scheme) => scheme.ministry))];
    const categoryPlaceholders = categoryNames.map(() => "?").join(", ");
    const ministryPlaceholders = ministryNames.map(() => "?").join(", ");
    const [categoryRows] = await connection.execute(
      `SELECT id, name FROM master_categories
       WHERE is_active = TRUE AND name IN (${categoryPlaceholders})`,
      categoryNames
    );
    const categoryIds = new Map(categoryRows.map((row) => [row.name, row.id]));
    const missingCategories = categoryNames.filter((name) => !categoryIds.has(name));
    if (missingCategories.length > 0) {
      throw new Error(`Active scheme categories are unavailable: ${missingCategories.join(", ")}`);
    }

    const [ministryRows] = await connection.execute(
      `SELECT id, ministry FROM master_ministry
       WHERE is_active = TRUE AND ministry IN (${ministryPlaceholders})`,
      ministryNames
    );
    const ministryIds = new Map(ministryRows.map((row) => [row.ministry, row.id]));
    const missingMinistries = ministryNames.filter((name) => !ministryIds.has(name));
    if (missingMinistries.length > 0) {
      throw new Error(`Active scheme ministries are unavailable: ${missingMinistries.join(", ")}`);
    }

    const mappingTables = [
      "scheme_categories",
      "scheme_states",
      "scheme_union_territories",
      "scheme_genders",
      "scheme_criteria",
      "scheme_numeric_rule"
    ];

    for (const scheme of schemeCatalog) {
      const details = {
        format: "paragraphs",
        items: [
          scheme.description,
          "Benefits, eligibility, geographic coverage, and application dates may vary by component and current official guidelines."
        ]
      };
      const benefits = {
        format: "bullets",
        items: ["Refer to the administering ministry's current guidelines for the applicable assistance and benefit amount."]
      };
      const eligibility = {
        format: "bullets",
        items: ["Eligibility depends on the scheme component and current official guidelines; confirm the requirements before applying."]
      };
      const documents = {
        format: "list",
        items: [
          "Aadhaar card or other valid government-issued photo identity proof.",
          "Current address proof.",
          "Passport-size photograph(s), if requested.",
          "Bank account or passbook details for benefit transfer.",
          "Income, caste, disability, or category certificate if applicable.",
          "Completed application form and scheme-specific declaration.",
          "Additional documents listed in the current official scheme guidelines."
        ]
      };
      const applicationProcess = {
        online: {
          enabled: true,
          subsections: [{
            title: "Check current official scheme information",
            format: "steps",
            steps: [
              "Review the administering ministry's current scheme guidelines and application channel.",
              "Confirm that applications are open for your location and beneficiary group.",
              "Apply through the channel specified by the scheme and track the application with the implementing authority."
            ]
          }]
        },
        offline: { enabled: false, subsections: [] }
      };
      const [result] = await connection.execute(
        `INSERT INTO schemes
           (code, name, ministry_id, coverage_type, details, benefits, eligibility,
            application_process, documents)
         VALUES (?, ?, ?, 'ALL_INDIA', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           id = LAST_INSERT_ID(id),
           name = VALUES(name),
           ministry_id = VALUES(ministry_id),
           coverage_type = VALUES(coverage_type),
           details = VALUES(details),
           benefits = VALUES(benefits),
           eligibility = VALUES(eligibility),
           application_process = VALUES(application_process),
           documents = VALUES(documents),
           is_active = TRUE`,
        [
          scheme.code,
          scheme.name,
          ministryIds.get(scheme.ministry),
          JSON.stringify(details),
          JSON.stringify(benefits),
          JSON.stringify(eligibility),
          JSON.stringify(applicationProcess),
          JSON.stringify(documents)
        ]
      );
      const schemeId = result.insertId;

      for (const table of mappingTables) {
        await connection.execute(`DELETE FROM ${table} WHERE scheme_id = ?`, [schemeId]);
      }

      const ids = scheme.categories.map((name) => categoryIds.get(name));
      const values = ids.map(() => "(?, ?)").join(", ");
      await connection.execute(
        `INSERT INTO scheme_categories (scheme_id, category_id) VALUES ${values}`,
        ids.flatMap((categoryId) => [schemeId, categoryId])
      );
    }

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Could not roll back scheme catalog seeding transaction", rollbackError);
    }
    throw error;
  }
}

const { ADMIN_ID, ADMIN_PASSWORD } = getAdminSeed();
const passwordHash = await hashPassword(ADMIN_PASSWORD);
const connection = await mysql.createConnection(getDatabaseConfig());

try {
  await connection.execute(
    `INSERT INTO admin_users (id, password_hash)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE id = VALUES(id)`,
    [ADMIN_ID, passwordHash]
  );
  console.log(`Admin "${ADMIN_ID}" is ready.`);
  await seedEducationSchemes(connection);
  console.log(`Seeded ${educationSchemes.length} all-India education schemes.`);
  await seedCatalogSchemes(connection);
  console.log(`Seeded ${schemeCatalog.length} all-India catalog schemes.`);
} finally {
  await connection.end();
}

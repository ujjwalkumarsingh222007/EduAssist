"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Profile,
  ProfileData,
  MarksheetTable,
  MarksheetSubject,
  VerifiedCertificate,
  ConfirmedFieldEntry,
  SiblingRecord,
  SemesterRecord,
  CompetitiveExamRecord,
  CertificationRecord,
  SkillRecord,
  ProjectRecord,
  ExperienceRecord,
  AchievementRecord,
  LanguageRecord,
  FieldConflictEntry,
} from "@/lib/types/profile";
import { maskSensitiveValue } from "@/lib/ai/privacy";
import {
  User,
  Users,
  Shield,
  GraduationCap,
  Award,
  FileCheck,
  CreditCard,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  Upload,
  Clock,
  Trash2,
  Database,
  Layers,
  Search,
  BookOpen,
  Briefcase,
  Code2,
  FileText,
  Globe,
  MapPin,
  DollarSign,
  Plus,
  Edit3,
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

export default function UniversalProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  // Sensitive ID Visibility Toggle Map
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  // Profile Search Filter
  const [searchFilter, setSearchFilter] = useState("");

  // Collapsible Section State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
    identity: true,
    address: true,
    family: true,
    secondary_10th: true,
    senior_secondary_12th: true,
    higher_education: true,
    skills: true,
    projects: true,
    experience: true,
    competitive_exams: false,
    certifications: false,
    achievements: false,
    languages: false,
    financial: true,
    documents: true,
  });

  // Active Section in Edit Mode (null = no section being edited)
  const [activeEditSection, setActiveEditSection] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  // Core Universal Profile Data State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pData, setPData] = useState<ProfileData>({});

  // Section Form Edit Buffers
  const [editPersonal, setEditPersonal] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "Male",
    phone: "",
    nationality: "Indian",
    blood_group: "",
    marital_status: "Unmarried",
    mother_tongue: "",
  });

  const [editAddress, setEditAddress] = useState({
    street: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    domicile_state: "",
  });

  const [editFamily, setEditFamily] = useState({
    father_name: "",
    father_occupation: "",
    father_education: "",
    father_income: "",
    father_phone: "",
    mother_name: "",
    mother_occupation: "",
    mother_education: "",
    guardian_name: "",
  });

  const [edit10th, setEdit10th] = useState({
    board_name: "",
    school_name: "",
    school_code: "",
    center_number: "",
    roll_number: "",
    registration_number: "",
    enrollment_number: "",
    certificate_number: "",
    passing_year: "",
    examination_year: "",
    percentage: "",
    cgpa: "",
    total_marks: "",
    obtained_marks: "",
    result: "PASS",
    division: "",
    grade: "",
  });

  const [edit12th, setEdit12th] = useState({
    board_name: "",
    school_name: "",
    school_code: "",
    center_number: "",
    stream: "Science (PCM)",
    roll_number: "",
    registration_number: "",
    enrollment_number: "",
    certificate_number: "",
    passing_year: "",
    examination_year: "",
    percentage: "",
    cgpa: "",
    total_marks: "",
    obtained_marks: "",
    result: "PASS",
    division: "",
    grade: "",
  });

  const [editHigherEd, setEditHigherEd] = useState({
    university_name: "",
    degree: "",
    branch: "",
    current_semester: "1",
    cgpa: "",
    graduation_year: "",
  });

  const [editFinancial, setEditFinancial] = useState({
    annual_income: "",
    category: "General",
    domicile: "",
    pwd_status: "No",
  });

  // Dynamic Skills & Projects Edit Buffers
  const [editSkillsList, setEditSkillsList] = useState<SkillRecord[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newSkillProficiency, setNewSkillProficiency] = useState<"Beginner" | "Intermediate" | "Advanced" | "Expert">("Intermediate");

  const [editProjectsList, setEditProjectsList] = useState<ProjectRecord[]>([]);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setErrorMessage("");
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage("Please log in to view your universal student profile.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      // 1. Fetch User Profile
      const { data: profileRow, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profError) {
        console.warn("[Profile Load] Notice:", profError.message);
      }

      // 2. Fetch User Verified Documents dynamically
      const { data: docRows } = await supabase
        .from("documents")
        .select("id, file_name, document_type, extraction_status, created_at, extracted_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setUserDocuments(docRows || []);

      if (profileRow) {
        const fullProf = profileRow as Profile;
        setProfile(fullProf);
        const data = fullProf.profile_data || {};
        setPData(data);
        populateEditBuffers(fullProf, data);
      } else {
        const initialProf: Profile = {
          user_id: user.id,
          full_name: user.user_metadata?.name || user.user_metadata?.full_name || "",
          phone: user.phone || "",
          profile_data: {
            personal: {
              full_name: user.user_metadata?.name || user.user_metadata?.full_name || "",
              email: user.email || "",
              nationality: "Indian",
              country: "India",
            },
            education: {},
            eligibility: {},
          },
        };
        setProfile(initialProf);
        setPData(initialProf.profile_data || {});
        populateEditBuffers(initialProf, initialProf.profile_data || {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load profile.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  function populateEditBuffers(prof: Profile, data: ProfileData) {
    setEditPersonal({
      full_name: prof.full_name || data.personal?.full_name || "",
      date_of_birth: prof.date_of_birth || data.personal?.date_of_birth || "",
      gender: prof.gender || data.personal?.gender || "Male",
      phone: prof.phone || data.personal?.phone || "",
      nationality: (data.personal?.nationality as string) || "Indian",
      blood_group: (data.personal?.blood_group as string) || "",
      marital_status: (data.personal?.marital_status as string) || "Unmarried",
      mother_tongue: (data.personal?.mother_tongue as string) || "",
    });

    setEditAddress({
      street: prof.address || data.personal?.address_line1 || data.address?.permanent?.street || "",
      city: prof.city || data.address?.permanent?.city || "",
      district: data.address?.permanent?.district || prof.city || "",
      state: prof.state || data.address?.permanent?.state || data.eligibility?.domicile || "",
      pincode: (data.personal?.pincode as string) || data.address?.permanent?.pincode || "",
      domicile_state: data.address?.domicile_state || prof.state || "",
    });

    setEditFamily({
      father_name: (data.family?.father_name as string) || "",
      father_occupation: (data.family?.father_occupation as string) || "",
      father_education: (data.family?.father_education as string) || "",
      father_income: String(data.family?.father_income || ""),
      father_phone: (data.family?.father_phone as string) || "",
      mother_name: (data.family?.mother_name as string) || "",
      mother_occupation: (data.family?.mother_occupation as string) || "",
      mother_education: (data.family?.mother_education as string) || "",
      guardian_name: (data.family?.guardian_name as string) || "",
    });

    setEdit10th({
      board_name: data.secondary_10th?.board_name || "",
      school_name: data.secondary_10th?.school_name || data.secondary_10th?.institution_name || "",
      school_code: data.secondary_10th?.school_code || "",
      center_number: data.secondary_10th?.center_number || "",
      roll_number: data.secondary_10th?.roll_number || "",
      registration_number: data.secondary_10th?.registration_number || "",
      enrollment_number: data.secondary_10th?.enrollment_number || "",
      certificate_number: data.secondary_10th?.certificate_number || "",
      passing_year: String(data.secondary_10th?.passing_year || data.secondary_10th?.year || ""),
      examination_year: String(data.secondary_10th?.examination_year || ""),
      percentage: String(data.secondary_10th?.percentage || ""),
      cgpa: String(data.secondary_10th?.cgpa || ""),
      total_marks: String(data.secondary_10th?.total_marks || ""),
      obtained_marks: String(data.secondary_10th?.obtained_marks || ""),
      result: data.secondary_10th?.result || "PASS",
      division: data.secondary_10th?.division || "",
      grade: data.secondary_10th?.grade || "",
    });

    setEdit12th({
      board_name: data.senior_secondary_12th?.board_name || "",
      school_name: data.senior_secondary_12th?.school_name || data.senior_secondary_12th?.institution_name || "",
      school_code: data.senior_secondary_12th?.school_code || "",
      center_number: data.senior_secondary_12th?.center_number || "",
      stream: (data.senior_secondary_12th?.stream as string) || "",
      roll_number: data.senior_secondary_12th?.roll_number || "",
      registration_number: data.senior_secondary_12th?.registration_number || "",
      enrollment_number: data.senior_secondary_12th?.enrollment_number || "",
      certificate_number: data.senior_secondary_12th?.certificate_number || "",
      passing_year: String(data.senior_secondary_12th?.passing_year || data.senior_secondary_12th?.year || ""),
      examination_year: String(data.senior_secondary_12th?.examination_year || ""),
      percentage: String(data.senior_secondary_12th?.percentage || ""),
      cgpa: String(data.senior_secondary_12th?.cgpa || ""),
      total_marks: String(data.senior_secondary_12th?.total_marks || ""),
      obtained_marks: String(data.senior_secondary_12th?.obtained_marks || ""),
      result: data.senior_secondary_12th?.result || "PASS",
      division: data.senior_secondary_12th?.division || "",
      grade: data.senior_secondary_12th?.grade || "",
    });

    setEditHigherEd({
      university_name: (data.education?.university_name as string) || "",
      degree: (data.education?.degree as string) || "",
      branch: (data.education?.branch as string) || "",
      current_semester: String(data.education?.current_semester || "1"),
      cgpa: String(data.education?.cgpa || ""),
      graduation_year: String(data.education?.graduation_year || data.education?.expected_graduation_year || ""),
    });

    setEditFinancial({
      annual_income: (data.eligibility?.annual_income as string) || "",
      category: (data.eligibility?.category as string) || "General",
      domicile: (data.eligibility?.domicile as string) || prof.state || "",
      pwd_status: (data.eligibility?.pwd_status as string) || "No",
    });

    setEditSkillsList(data.skills || []);
    setEditProjectsList(data.projects || []);
  }

  function startEditSection(sectionKey: string) {
    if (profile && pData) {
      populateEditBuffers(profile, pData);
    }
    setActiveEditSection(sectionKey);
    setOpenSections((prev) => ({ ...prev, [sectionKey]: true }));
  }

  function cancelEditSection() {
    if (profile && pData) {
      populateEditBuffers(profile, pData);
    }
    setActiveEditSection(null);
  }

  // ==========================================
  // SAFE DEEP MERGE PERSISTENCE
  // ==========================================
  async function saveSectionChanges(sectionKey: string) {
    try {
      setSaving(true);
      setErrorMessage("");
      setSaveSuccess(false);

      const supabase = createClient();
      const currentPData: ProfileData = { ...(pData || {}) };
      const currentConfirmed = { ...(currentPData.confirmed_fields || {}) };

      let updatedFullName = profile?.full_name || "";
      let updatedDob = profile?.date_of_birth || "";
      let updatedGender = profile?.gender || "";
      let updatedPhone = profile?.phone || "";
      let updatedAddress = profile?.address || "";
      let updatedCity = profile?.city || "";
      let updatedState = profile?.state || "";

      if (sectionKey === "personal") {
        updatedFullName = editPersonal.full_name.trim();
        updatedDob = editPersonal.date_of_birth;
        updatedGender = editPersonal.gender;
        updatedPhone = editPersonal.phone.trim();

        currentPData.personal = {
          ...(currentPData.personal || {}),
          full_name: updatedFullName,
          date_of_birth: updatedDob,
          gender: updatedGender,
          phone: updatedPhone,
          nationality: editPersonal.nationality,
          blood_group: editPersonal.blood_group,
          marital_status: editPersonal.marital_status,
          mother_tongue: editPersonal.mother_tongue,
        };

        if (currentConfirmed.full_name) {
          currentConfirmed.full_name.value = updatedFullName;
          currentConfirmed.full_name.field_status = "User Edited";
        }
      } else if (sectionKey === "address") {
        updatedAddress = editAddress.street.trim();
        updatedCity = editAddress.city.trim();
        updatedState = editAddress.state.trim();

        currentPData.address = {
          ...(currentPData.address || {}),
          permanent: {
            street: updatedAddress,
            city: updatedCity,
            district: editAddress.district.trim(),
            state: updatedState,
            pincode: editAddress.pincode.trim(),
          },
          domicile_state: editAddress.domicile_state.trim(),
        };
      } else if (sectionKey === "family") {
        currentPData.family = {
          ...(currentPData.family || {}),
          father_name: editFamily.father_name.trim(),
          father_occupation: editFamily.father_occupation.trim(),
          father_education: editFamily.father_education.trim(),
          father_income: editFamily.father_income.trim(),
          father_phone: editFamily.father_phone.trim(),
          mother_name: editFamily.mother_name.trim(),
          mother_occupation: editFamily.mother_occupation.trim(),
          mother_education: editFamily.mother_education.trim(),
          guardian_name: editFamily.guardian_name.trim(),
        };

        if (currentConfirmed.father_name) {
          currentConfirmed.father_name.value = editFamily.father_name.trim();
          currentConfirmed.father_name.field_status = "User Edited";
        }
      } else if (sectionKey === "secondary_10th") {
        currentPData.secondary_10th = {
          ...(currentPData.secondary_10th || {}),
          board_name: edit10th.board_name.trim(),
          school_name: edit10th.school_name.trim(),
          school_code: edit10th.school_code.trim(),
          center_number: edit10th.center_number.trim(),
          roll_number: edit10th.roll_number.trim(),
          registration_number: edit10th.registration_number.trim(),
          enrollment_number: edit10th.enrollment_number.trim(),
          certificate_number: edit10th.certificate_number.trim(),
          passing_year: edit10th.passing_year.trim(),
          examination_year: edit10th.examination_year.trim(),
          percentage: edit10th.percentage.trim(),
          cgpa: edit10th.cgpa.trim(),
          total_marks: edit10th.total_marks.trim(),
          obtained_marks: edit10th.obtained_marks.trim(),
          result: edit10th.result.trim(),
          division: edit10th.division.trim(),
          grade: edit10th.grade.trim(),
          source_document_name: currentPData.secondary_10th?.source_document_name || "Class 10 Marksheet",
        };
      } else if (sectionKey === "senior_secondary_12th") {
        currentPData.senior_secondary_12th = {
          ...(currentPData.senior_secondary_12th || {}),
          board_name: edit12th.board_name.trim(),
          school_name: edit12th.school_name.trim(),
          school_code: edit12th.school_code.trim(),
          center_number: edit12th.center_number.trim(),
          stream: edit12th.stream,
          roll_number: edit12th.roll_number.trim(),
          registration_number: edit12th.registration_number.trim(),
          enrollment_number: edit12th.enrollment_number.trim(),
          certificate_number: edit12th.certificate_number.trim(),
          passing_year: edit12th.passing_year.trim(),
          examination_year: edit12th.examination_year.trim(),
          percentage: edit12th.percentage.trim(),
          cgpa: edit12th.cgpa.trim(),
          total_marks: edit12th.total_marks.trim(),
          obtained_marks: edit12th.obtained_marks.trim(),
          result: edit12th.result.trim(),
          division: edit12th.division.trim(),
          grade: edit12th.grade.trim(),
          source_document_name: currentPData.senior_secondary_12th?.source_document_name || "Class 12 Marksheet",
        };
      } else if (sectionKey === "higher_education") {
        currentPData.education = {
          ...(currentPData.education || {}),
          university_name: editHigherEd.university_name.trim(),
          degree: editHigherEd.degree.trim(),
          branch: editHigherEd.branch.trim(),
          current_semester: editHigherEd.current_semester,
          cgpa: editHigherEd.cgpa.trim(),
          graduation_year: editHigherEd.graduation_year.trim(),
        };
      } else if (sectionKey === "skills") {
        currentPData.skills = editSkillsList;
      } else if (sectionKey === "projects") {
        currentPData.projects = editProjectsList;
      } else if (sectionKey === "financial") {
        currentPData.eligibility = {
          ...(currentPData.eligibility || {}),
          annual_income: editFinancial.annual_income.trim(),
          category: editFinancial.category,
          domicile: editFinancial.domicile.trim(),
          pwd_status: editFinancial.pwd_status,
        };
      }

      currentPData.confirmed_fields = currentConfirmed;

      const updatePayload = {
        user_id: userId,
        full_name: updatedFullName,
        date_of_birth: updatedDob || null,
        gender: updatedGender || null,
        phone: updatedPhone || null,
        address: updatedAddress || null,
        city: updatedCity || null,
        state: updatedState || null,
        profile_data: currentPData,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase.from("profiles").upsert(updatePayload, {
        onConflict: "user_id",
      });

      if (upsertErr) {
        throw new Error(upsertErr.message);
      }

      setPData(currentPData);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: updatedFullName,
              date_of_birth: updatedDob,
              gender: updatedGender,
              phone: updatedPhone,
              address: updatedAddress,
              city: updatedCity,
              state: updatedState,
              profile_data: currentPData,
            }
          : {
              user_id: userId,
              full_name: updatedFullName,
              date_of_birth: updatedDob,
              gender: updatedGender,
              phone: updatedPhone,
              address: updatedAddress,
              city: updatedCity,
              state: updatedState,
              profile_data: currentPData,
            }
      );

      setSaveSuccess(true);
      setActiveEditSection(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save changes.";
      console.error("[Profile Save Error]:", msg);
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleAddSkill() {
    if (!newSkillInput.trim()) return;
    const newSkill: SkillRecord = {
      skill_name: newSkillInput.trim(),
      proficiency: newSkillProficiency,
      verified: true,
    };
    setEditSkillsList((prev) => [...prev, newSkill]);
    setNewSkillInput("");
  }

  function handleRemoveSkill(index: number) {
    setEditSkillsList((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleSection(sec: string) {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  }

  function toggleSensitive(key: string) {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ==========================================
  // PROFILE COMPLETION CALCULATIONS
  // ==========================================
  const stats = useMemo(() => {
    let basicFieldsCount = 0;
    let basicTotal = 5;
    if (profile?.full_name || pData.personal?.full_name) basicFieldsCount++;
    if (profile?.date_of_birth || pData.personal?.date_of_birth) basicFieldsCount++;
    if (profile?.gender || pData.personal?.gender) basicFieldsCount++;
    if (profile?.phone || pData.personal?.phone) basicFieldsCount++;
    if (userEmail || pData.personal?.email) basicFieldsCount++;

    let academicCount = 0;
    let academicTotal = 5;
    if (pData.secondary_10th?.percentage || pData.academic_results?.some((r) => r.examination_name?.includes("10"))) academicCount++;
    if (pData.senior_secondary_12th?.percentage || pData.academic_results?.some((r) => r.examination_name?.includes("12"))) academicCount++;
    if (pData.education?.degree) academicCount++;
    if (pData.education?.branch) academicCount++;
    if (pData.education?.cgpa || pData.education?.percentage) academicCount++;

    let familyCount = 0;
    let familyTotal = 3;
    if (pData.family?.father_name) familyCount++;
    if (pData.family?.mother_name) familyCount++;
    if (pData.eligibility?.annual_income || pData.family?.father_income) familyCount++;

    let careerCount = 0;
    let careerTotal = 3;
    if (pData.skills && pData.skills.length > 0) careerCount++;
    if (pData.projects && pData.projects.length > 0) careerCount++;
    if (pData.experience && pData.experience.length > 0) careerCount++;

    const basicPct = Math.round((basicFieldsCount / basicTotal) * 100);
    const academicPct = Math.round((academicCount / academicTotal) * 100);
    const familyPct = Math.round((familyCount / familyTotal) * 100);
    const careerPct = Math.round((careerCount / careerTotal) * 100);
    const overallPct = Math.round(basicPct * 0.3 + academicPct * 0.35 + familyPct * 0.15 + careerPct * 0.2);

    const verifiedCount =
      Object.keys(pData.confirmed_fields || {}).length +
      (pData.academic_results?.length || 0) * 4 +
      (pData.certificates?.length || 0) * 2;

    const totalDocs = userDocuments.length || (pData.meta?.source_documents?.length || 0) + (pData.certificates?.length || 0);

    return {
      basicPct,
      academicPct,
      familyPct,
      careerPct,
      overallPct,
      verifiedCount,
      totalDocs,
    };
  }, [profile, pData, userEmail, userDocuments]);

  function exportProfileData() {
    const exportable = {
      student_profile: {
        full_name: profile?.full_name,
        date_of_birth: profile?.date_of_birth,
        gender: profile?.gender,
        contact: {
          phone: profile?.phone,
          email: userEmail,
        },
        address: pData.address,
        family: pData.family,
        academics: {
          secondary_10th: pData.secondary_10th,
          senior_secondary_12th: pData.senior_secondary_12th,
          higher_education: pData.education,
        },
        skills: pData.skills,
        projects: pData.projects,
        experience: pData.experience,
        certifications: pData.certifications,
        eligibility: pData.eligibility,
        export_date: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(profile?.full_name || "student").replace(/\s+/g, "_")}_universal_profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const matchesSearch = (text: string) => {
    if (!searchFilter.trim()) return true;
    return text.toLowerCase().includes(searchFilter.toLowerCase().trim());
  };

  if (loading) {
    return (
      <div className="p-12 text-center max-w-5xl mx-auto space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-800">Loading Universal Student Profile...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 lg:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              Universal Student Profile • Reusable Across Applications
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              {profile?.full_name || "Student Profile"}
            </h1>
            <p className="text-xs text-blue-200 flex items-center gap-4">
              <span>{userEmail}</span>
              {profile?.phone && <span>• {profile.phone}</span>}
              <span>• Indian Citizen</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportProfileData}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Summary
            </button>
            <Link
              href="/dashboard/documents"
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-blue-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Document
            </Link>
          </div>
        </div>

        {/* Profile Completion KPI Progress Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span>Profile Completion</span>
              <span className="font-bold text-white">{stats.overallPct}%</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${stats.overallPct}%` }} />
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span>Academic Data</span>
              <span className="font-bold text-white">{stats.academicPct}%</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${stats.academicPct}%` }} />
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span>Verified Fields</span>
              <span className="font-bold text-white">{stats.verifiedCount}</span>
            </div>
            <p className="text-[11px] text-blue-300 mt-1">✓ Document verified</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span>Linked Documents</span>
              <span className="font-bold text-white">{stats.totalDocs}</span>
            </div>
            <p className="text-[11px] text-blue-300 mt-1">10th, 12th, IDs, Income</p>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>✓ Profile updated successfully and synchronized for extension autofill.</span>
        </div>
      )}

      {/* Search Bar Across Universal Profile */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search your information (e.g. 12th percentage, roll number, father, income, skills)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500"
          />
        </div>
        {searchFilter && (
          <button
            onClick={() => setSearchFilter("")}
            className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* =========================================================================
          SECTION 1: PERSONAL INFORMATION
      ========================================================================= */}
      {matchesSearch("personal name birth gender phone email") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("personal")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Complete
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "personal" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("personal")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("personal")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit
                </button>
              )}
              <div onClick={() => toggleSection("personal")} className="cursor-pointer p-1 text-slate-400">
                {openSections.personal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.personal && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {activeEditSection === "personal" ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={editPersonal.full_name}
                      onChange={(e) => setEditPersonal({ ...editPersonal, full_name: e.target.value })}
                      className="w-full p-2 border border-blue-400 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editPersonal.date_of_birth}
                      onChange={(e) => setEditPersonal({ ...editPersonal, date_of_birth: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Gender</label>
                    <select
                      value={editPersonal.gender}
                      onChange={(e) => setEditPersonal({ ...editPersonal, gender: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      value={editPersonal.phone}
                      onChange={(e) => setEditPersonal({ ...editPersonal, phone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Nationality</label>
                    <input
                      type="text"
                      value={editPersonal.nationality}
                      onChange={(e) => setEditPersonal({ ...editPersonal, nationality: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Blood Group</label>
                    <input
                      type="text"
                      value={editPersonal.blood_group}
                      placeholder="e.g. O+, B+"
                      onChange={(e) => setEditPersonal({ ...editPersonal, blood_group: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Full Name</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {profile?.full_name || "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Date of Birth</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {profile?.date_of_birth || pData.personal?.date_of_birth || "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Gender</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {profile?.gender || pData.personal?.gender || "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Mobile Phone</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {profile?.phone || pData.personal?.phone || "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Email Address</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {userEmail || pData.personal?.email || "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Nationality</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.personal?.nationality || "Indian"}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: IDENTITY & SENSITIVE GOVERNMENT IDS
      ========================================================================= */}
      {matchesSearch("identity aadhaar pan passport voter driving") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div
            onClick={() => toggleSection("identity")}
            className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Government Identity Numbers</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                🔒 Masked by Default
              </span>
            </div>
            {openSections.identity ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>

          {openSections.identity && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Aadhaar Number</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">
                    {pData.identity?.aadhaar_number || pData.confirmed_fields?.aadhaar_number?.value ? (
                      showSensitive.aadhaar
                        ? pData.identity?.aadhaar_number || pData.confirmed_fields?.aadhaar_number?.value
                        : maskSensitiveValue("aadhaar_number", pData.identity?.aadhaar_number || pData.confirmed_fields?.aadhaar_number?.value || "")
                    ) : (
                      <span className="text-slate-400 font-sans italic font-normal">Not Provided</span>
                    )}
                  </span>
                  {(pData.identity?.aadhaar_number || pData.confirmed_fields?.aadhaar_number?.value) && (
                    <button
                      onClick={() => toggleSensitive("aadhaar")}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showSensitive.aadhaar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">PAN Card Number</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900">
                    {pData.identity?.pan_number || pData.confirmed_fields?.pan_number?.value ? (
                      showSensitive.pan
                        ? pData.identity?.pan_number || pData.confirmed_fields?.pan_number?.value
                        : maskSensitiveValue("pan_number", pData.identity?.pan_number || pData.confirmed_fields?.pan_number?.value || "")
                    ) : (
                      <span className="text-slate-400 font-sans italic font-normal">Not Provided</span>
                    )}
                  </span>
                  {(pData.identity?.pan_number || pData.confirmed_fields?.pan_number?.value) && (
                    <button
                      onClick={() => toggleSensitive("pan")}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showSensitive.pan ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Passport / Voter ID</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-500 italic">
                  Optional (Not Provided)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 3: ADDRESS & DOMICILE
      ========================================================================= */}
      {matchesSearch("address domicile state city pincode district") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("address")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Address & Domicile</h3>
              {(profile?.address || profile?.city || profile?.state) && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "address" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("address")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("address")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit
                </button>
              )}
              <div onClick={() => toggleSection("address")} className="cursor-pointer p-1 text-slate-400">
                {openSections.address ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.address && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {activeEditSection === "address" ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Permanent Residential Address</label>
                    <input
                      type="text"
                      value={editAddress.street}
                      onChange={(e) => setEditAddress({ ...editAddress, street: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">City</label>
                    <input
                      type="text"
                      value={editAddress.city}
                      onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">State of Domicile</label>
                    <input
                      type="text"
                      value={editAddress.state}
                      onChange={(e) => setEditAddress({ ...editAddress, state: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Permanent Residential Address</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {profile?.address || pData.personal?.address_line1 || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">City / District</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {profile?.city || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">State of Domicile</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {profile?.state || pData.eligibility?.domicile || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 4: FAMILY INFORMATION
      ========================================================================= */}
      {matchesSearch("family father mother guardian occupation income") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("family")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Family Information</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Complete
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "family" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("family")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("family")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit
                </button>
              )}
              <div onClick={() => toggleSection("family")} className="cursor-pointer p-1 text-slate-400">
                {openSections.family ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.family && (
            <div className="p-6 space-y-4 text-xs">
              {activeEditSection === "family" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Father's Full Name</label>
                    <input
                      type="text"
                      value={editFamily.father_name}
                      onChange={(e) => setEditFamily({ ...editFamily, father_name: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Father's Occupation</label>
                    <input
                      type="text"
                      value={editFamily.father_occupation}
                      onChange={(e) => setEditFamily({ ...editFamily, father_occupation: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mother's Full Name</label>
                    <input
                      type="text"
                      value={editFamily.mother_name}
                      onChange={(e) => setEditFamily({ ...editFamily, mother_name: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Father's Full Name</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.family?.father_name || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Father's Occupation</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.family?.father_occupation || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Mother's Full Name</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.family?.mother_name || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 5: CLASS 10 / SECONDARY EDUCATION
      ========================================================================= */}
      {matchesSearch("10th secondary marksheet roll percentage board") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("secondary_10th")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Class 10 / Secondary Education</h3>
              {pData.secondary_10th?.board_name && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ {pData.secondary_10th?.source_document_name ? `From verified ${pData.secondary_10th.source_document_name}` : "Verified"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "secondary_10th" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("secondary_10th")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("secondary_10th")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit
                </button>
              )}
              <div onClick={() => toggleSection("secondary_10th")} className="cursor-pointer p-1 text-slate-400">
                {openSections.secondary_10th ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.secondary_10th && (
            <div className="p-6 space-y-5 text-xs">
              {activeEditSection === "secondary_10th" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">School / Institution Name</label>
                      <input
                        type="text"
                        value={edit10th.school_name}
                        onChange={(e) => setEdit10th({ ...edit10th, school_name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Board Name</label>
                      <input
                        type="text"
                        value={edit10th.board_name}
                        onChange={(e) => setEdit10th({ ...edit10th, board_name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">School Code / Center No</label>
                      <input
                        type="text"
                        value={edit10th.school_code}
                        onChange={(e) => setEdit10th({ ...edit10th, school_code: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                        placeholder="e.g. 08234"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Roll Number</label>
                      <input
                        type="text"
                        value={edit10th.roll_number}
                        onChange={(e) => setEdit10th({ ...edit10th, roll_number: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Registration / Enrolment No</label>
                      <input
                        type="text"
                        value={edit10th.registration_number}
                        onChange={(e) => setEdit10th({ ...edit10th, registration_number: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Passing Year</label>
                      <input
                        type="text"
                        value={edit10th.passing_year}
                        onChange={(e) => setEdit10th({ ...edit10th, passing_year: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Result Status</label>
                      <input
                        type="text"
                        value={edit10th.result}
                        onChange={(e) => setEdit10th({ ...edit10th, result: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-semibold text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Marks Obtained</label>
                      <input
                        type="text"
                        value={edit10th.obtained_marks}
                        onChange={(e) => setEdit10th({ ...edit10th, obtained_marks: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                        placeholder="e.g. 457"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Maximum Possible Marks</label>
                      <input
                        type="text"
                        value={edit10th.total_marks}
                        onChange={(e) => setEdit10th({ ...edit10th, total_marks: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                        placeholder="e.g. 500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Percentage Score</label>
                      <input
                        type="text"
                        value={edit10th.percentage}
                        onChange={(e) => setEdit10th({ ...edit10th, percentage: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-bold text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">CGPA / Grade</label>
                      <input
                        type="text"
                        value={edit10th.cgpa || edit10th.grade}
                        onChange={(e) => setEdit10th({ ...edit10th, cgpa: e.target.value, grade: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">School / Institution</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.secondary_10th?.school_name || pData.secondary_10th?.institution_name || (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Board</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.secondary_10th?.board_name || (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Roll Number</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900">
                        {pData.secondary_10th?.roll_number || (
                          <span className="text-slate-400 font-normal italic font-sans">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Registration / Enrolment No</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900">
                        {pData.secondary_10th?.registration_number || pData.secondary_10th?.enrollment_number || (
                          <span className="text-slate-400 font-normal italic font-sans">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Passing Year</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.secondary_10th?.passing_year || (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Result Status</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-emerald-800">
                        {pData.secondary_10th?.result || "PASS"} {pData.secondary_10th?.division ? `(${pData.secondary_10th.division})` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Marks Obtained</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.secondary_10th?.obtained_marks ? (
                          <span>{pData.secondary_10th.obtained_marks}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Max Marks</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.secondary_10th?.total_marks ? (
                          <span>{pData.secondary_10th.total_marks}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Percentage Score</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.secondary_10th?.percentage ? (
                          <span className="font-bold text-emerald-800">{pData.secondary_10th.percentage}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">CGPA / Grade</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.secondary_10th?.cgpa || pData.secondary_10th?.grade || (
                          <span className="text-slate-400 font-normal italic">—</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Subjects Breakdown Table */}
                  {Array.isArray(pData.secondary_10th?.subjects) && pData.secondary_10th.subjects.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Subject Breakdown</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Subject Code</th>
                              <th className="py-2 px-3">Subject Name</th>
                              <th className="py-2 px-3 text-right">Marks Obtained</th>
                              <th className="py-2 px-3 text-right">Max Marks</th>
                              <th className="py-2 px-3 text-center">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {pData.secondary_10th.subjects.map((sub, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono text-slate-500">{sub.subject_code || "—"}</td>
                                <td className="py-2 px-3 font-medium text-slate-800">{sub.subject_name}</td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-900">{sub.marks_obtained ?? "—"}</td>
                                <td className="py-2 px-3 text-right text-slate-500">{sub.maximum_marks ?? "—"}</td>
                                <td className="py-2 px-3 text-center">
                                  {sub.grade ? (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                      {sub.grade}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Custom Fields */}
                  {pData.secondary_10th?.custom_fields && Object.keys(pData.secondary_10th.custom_fields).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      {Object.values(pData.secondary_10th.custom_fields).map((cf) => (
                        <div key={cf.key} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
                          <span className="font-semibold text-slate-500">{cf.label}:</span> <span className="font-bold text-slate-900">{String(cf.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 6: CLASS 12 / SENIOR SECONDARY EDUCATION
      ========================================================================= */}
      {matchesSearch("12th higher secondary marksheet stream pcm pcb percentage board") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("senior_secondary_12th")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Class 12 / Senior Secondary Education</h3>
              {pData.senior_secondary_12th?.board_name && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ {pData.senior_secondary_12th?.source_document_name ? `From verified ${pData.senior_secondary_12th.source_document_name}` : "Verified"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "senior_secondary_12th" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("senior_secondary_12th")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("senior_secondary_12th")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit
                </button>
              )}
              <div onClick={() => toggleSection("senior_secondary_12th")} className="cursor-pointer p-1 text-slate-400">
                {openSections.senior_secondary_12th ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.senior_secondary_12th && (
            <div className="p-6 space-y-5 text-xs">
              {activeEditSection === "senior_secondary_12th" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">School / Junior College Name</label>
                      <input
                        type="text"
                        value={edit12th.school_name}
                        onChange={(e) => setEdit12th({ ...edit12th, school_name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Board</label>
                      <input
                        type="text"
                        value={edit12th.board_name}
                        onChange={(e) => setEdit12th({ ...edit12th, board_name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Stream</label>
                      <input
                        type="text"
                        value={edit12th.stream}
                        onChange={(e) => setEdit12th({ ...edit12th, stream: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                        placeholder="Science (PCM) / Commerce"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Roll Number</label>
                      <input
                        type="text"
                        value={edit12th.roll_number}
                        onChange={(e) => setEdit12th({ ...edit12th, roll_number: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Registration / Enrolment No</label>
                      <input
                        type="text"
                        value={edit12th.registration_number}
                        onChange={(e) => setEdit12th({ ...edit12th, registration_number: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Passing Year</label>
                      <input
                        type="text"
                        value={edit12th.passing_year}
                        onChange={(e) => setEdit12th({ ...edit12th, passing_year: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Result Status</label>
                      <input
                        type="text"
                        value={edit12th.result}
                        onChange={(e) => setEdit12th({ ...edit12th, result: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-semibold text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Marks Obtained</label>
                      <input
                        type="text"
                        value={edit12th.obtained_marks}
                        onChange={(e) => setEdit12th({ ...edit12th, obtained_marks: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                        placeholder="e.g. 473"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Maximum Marks</label>
                      <input
                        type="text"
                        value={edit12th.total_marks}
                        onChange={(e) => setEdit12th({ ...edit12th, total_marks: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                        placeholder="e.g. 500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Percentage Score</label>
                      <input
                        type="text"
                        value={edit12th.percentage}
                        onChange={(e) => setEdit12th({ ...edit12th, percentage: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none font-bold text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">CGPA / Grade</label>
                      <input
                        type="text"
                        value={edit12th.cgpa || edit12th.grade}
                        onChange={(e) => setEdit12th({ ...edit12th, cgpa: e.target.value, grade: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">School / Junior College</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.school_name || pData.senior_secondary_12th?.institution_name || (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Board</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.board_name || (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Stream</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-purple-900">
                        {pData.senior_secondary_12th?.stream || (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Roll Number</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.roll_number || (
                          <span className="text-slate-400 font-normal italic font-sans">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Registration / Enrolment No</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.registration_number || pData.senior_secondary_12th?.enrollment_number || (
                          <span className="text-slate-400 font-normal italic font-sans">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Passing Year</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.passing_year || (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Result Status</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-emerald-800">
                        {pData.senior_secondary_12th?.result || "PASS"} {pData.senior_secondary_12th?.division ? `(${pData.senior_secondary_12th.division})` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Marks Obtained</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.obtained_marks ? (
                          <span>{pData.senior_secondary_12th.obtained_marks}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Max Marks</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.total_marks ? (
                          <span>{pData.senior_secondary_12th.total_marks}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Overall Percentage</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.percentage ? (
                          <span className="font-bold text-emerald-800">{pData.senior_secondary_12th.percentage}</span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">CGPA / Grade</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                        {pData.senior_secondary_12th?.cgpa || pData.senior_secondary_12th?.grade || (
                          <span className="text-slate-400 font-normal italic">—</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Subjects Breakdown Table */}
                  {Array.isArray(pData.senior_secondary_12th?.subjects) && pData.senior_secondary_12th.subjects.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Subject Breakdown</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Subject Code</th>
                              <th className="py-2 px-3">Subject Name</th>
                              <th className="py-2 px-3 text-right">Marks Obtained</th>
                              <th className="py-2 px-3 text-right">Max Marks</th>
                              <th className="py-2 px-3 text-center">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {pData.senior_secondary_12th.subjects.map((sub, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono text-slate-500">{sub.subject_code || "—"}</td>
                                <td className="py-2 px-3 font-medium text-slate-800">{sub.subject_name}</td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-900">{sub.marks_obtained ?? "—"}</td>
                                <td className="py-2 px-3 text-right text-slate-500">{sub.maximum_marks ?? "—"}</td>
                                <td className="py-2 px-3 text-center">
                                  {sub.grade ? (
                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                                      {sub.grade}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Custom Fields */}
                  {pData.senior_secondary_12th?.custom_fields && Object.keys(pData.senior_secondary_12th.custom_fields).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                      {Object.values(pData.senior_secondary_12th.custom_fields).map((cf) => (
                        <div key={cf.key} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
                          <span className="font-semibold text-slate-500">{cf.label}:</span> <span className="font-bold text-slate-900">{String(cf.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 7: HIGHER EDUCATION & COLLEGE
      ========================================================================= */}
      {matchesSearch("university college degree btech course branch semester cgpa") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("higher_education")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <Award className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Higher Education / Degree</h3>
              {pData.education?.degree && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Currently Enrolled
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "higher_education" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("higher_education")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("higher_education")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit
                </button>
              )}
              <div onClick={() => toggleSection("higher_education")} className="cursor-pointer p-1 text-slate-400">
                {openSections.higher_education ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.higher_education && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {activeEditSection === "higher_education" ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">University / Institute</label>
                    <input
                      type="text"
                      value={editHigherEd.university_name}
                      onChange={(e) => setEditHigherEd({ ...editHigherEd, university_name: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Degree</label>
                    <input
                      type="text"
                      value={editHigherEd.degree}
                      onChange={(e) => setEditHigherEd({ ...editHigherEd, degree: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Branch</label>
                    <input
                      type="text"
                      value={editHigherEd.branch}
                      onChange={(e) => setEditHigherEd({ ...editHigherEd, branch: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Cumulative CGPA</label>
                    <input
                      type="text"
                      value={editHigherEd.cgpa}
                      onChange={(e) => setEditHigherEd({ ...editHigherEd, cgpa: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none font-bold text-emerald-800"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">University / Institute</label>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.education?.university_name || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Degree & Program</label>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.education?.degree || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Branch / Specialization</label>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.education?.branch || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Cumulative CGPA</label>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.education?.cgpa ? (
                        <span className="font-bold text-emerald-800">{pData.education.cgpa} / 10.0</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 8: TECHNICAL SKILLS & PROFICIENCY
      ========================================================================= */}
      {matchesSearch("skills programming python react java git devops") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("skills")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Technical Skills & Proficiency</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Feeds Internship Matching
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "skills" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("skills")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("skills")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit Skills
                </button>
              )}
              <div onClick={() => toggleSection("skills")} className="cursor-pointer p-1 text-slate-400">
                {openSections.skills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.skills && (
            <div className="p-6 space-y-4 text-xs">
              {activeEditSection === "skills" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="Add skill (e.g. Docker, C++, GraphQL)..."
                    className="p-2 border border-slate-300 rounded-lg text-xs outline-none flex-1"
                  />
                  <select
                    value={newSkillProficiency}
                    onChange={(e) => setNewSkillProficiency(e.target.value as "Beginner" | "Intermediate" | "Advanced" | "Expert")}
                    className="p-2 border border-slate-300 rounded-lg text-xs outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Skill
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {(activeEditSection === "skills" ? editSkillsList : pData.skills || []).length === 0 ? (
                  <p className="text-slate-400 italic">No technical skills added yet.</p>
                ) : (
                  (activeEditSection === "skills" ? editSkillsList : pData.skills || []).map((sk, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2"
                    >
                      <span className="font-bold text-slate-900">{sk.skill_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                        {sk.proficiency}
                      </span>
                      {activeEditSection === "skills" && (
                        <button
                          onClick={() => handleRemoveSkill(idx)}
                          className="text-red-500 hover:text-red-700 font-bold ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 9: FINANCIAL & ELIGIBILITY CERTIFICATES
      ========================================================================= */}
      {matchesSearch("financial income category caste domicile certificate ews obc sc st") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div
              onClick={() => toggleSection("financial")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Financial & Eligibility Information</h3>
              {pData.eligibility?.annual_income && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Verified for Scholarships
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeEditSection === "financial" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => saveSectionChanges("financial")}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditSection}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditSection("financial")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-blue-600" />
                  Edit
                </button>
              )}
              <div onClick={() => toggleSection("financial")} className="cursor-pointer p-1 text-slate-400">
                {openSections.financial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {openSections.financial && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {activeEditSection === "financial" ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Annual Family Income (INR)</label>
                    <input
                      type="text"
                      value={editFinancial.annual_income}
                      onChange={(e) => setEditFinancial({ ...editFinancial, annual_income: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Social Category</label>
                    <select
                      value={editFinancial.category}
                      onChange={(e) => setEditFinancial({ ...editFinancial, category: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none font-semibold"
                    >
                      <option value="General">General / Unreserved</option>
                      <option value="OBC">OBC (Other Backward Classes)</option>
                      <option value="SC">SC (Scheduled Caste)</option>
                      <option value="ST">ST (Scheduled Tribe)</option>
                      <option value="EWS">EWS (Economically Weaker Section)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Disability (PwD) Status</label>
                    <select
                      value={editFinancial.pwd_status}
                      onChange={(e) => setEditFinancial({ ...editFinancial, pwd_status: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Annual Family Income</label>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.eligibility?.annual_income ? (
                        <span className="font-bold text-emerald-800">₹{pData.eligibility.annual_income} / year</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </p>
                    {pData.confirmed_fields?.annual_income && (
                      <span className="text-[10px] text-slate-400 mt-1 block">✓ Verified from Income Certificate</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Social Category</label>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.eligibility?.category || (
                        <span className="text-slate-400 font-normal italic">Not Provided</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Disability (PwD) Status</label>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                      {pData.eligibility?.pwd_status || "No"}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          DYNAMIC CUSTOM SECTIONS (Scholarships, Domicile, Other Certificates)
      ========================================================================= */}
      {Array.isArray(pData.custom_sections) && pData.custom_sections.length > 0 && (
        <>
          {pData.custom_sections.map((cSec) => (
            <div key={cSec.section_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div
                  onClick={() => toggleSection(cSec.section_id)}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">{cSec.title}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Dynamic Section
                  </span>
                </div>
                <div onClick={() => toggleSection(cSec.section_id)} className="cursor-pointer p-1 text-slate-400">
                  {openSections[cSec.section_id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {openSections[cSec.section_id] && (
                <div className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {cSec.fields.map((f) => (
                      <div key={f.key}>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">{f.label}</label>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900">
                          {String(f.value || "—")}
                        </div>
                      </div>
                    ))}
                  </div>
                  {Boolean(cSec.metadata?.source_document_name) && (
                    <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                      ✓ Extracted from {String(cSec.metadata?.source_document_name)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* =========================================================================
          SECTION 10: VERIFIED DOCUMENTS REPOSITORY
      ========================================================================= */}
      {matchesSearch("documents marksheet certificate aadhaar income") && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div
            onClick={() => toggleSection("documents")}
            className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Verified Documents Index</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                userDocuments.length > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {userDocuments.length} Verified Document{userDocuments.length === 1 ? "" : "s"}
              </span>
            </div>
            {openSections.documents ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>

          {openSections.documents && (
            <div className="p-6 space-y-3 text-xs">
              {userDocuments.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">0 Verified Documents</p>
                  <p className="text-[11px] text-slate-400">
                    No verified documents uploaded yet. Upload documents to automatically extract and verify profile details.
                  </p>
                  <Link
                    href="/dashboard/documents"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline mt-2"
                  >
                    Upload Documents &rarr;
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {userDocuments.map((doc, i) => (
                    <div key={doc.id || i} className="p-3.5 bg-slate-50 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{doc.file_name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {doc.document_type || "Student Document"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Status: {doc.extraction_status === "completed" ? "Extracted & Verified" : doc.extraction_status} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg shrink-0">
                        ✓ {doc.extraction_status === "completed" ? "Confirmed" : "Uploaded"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

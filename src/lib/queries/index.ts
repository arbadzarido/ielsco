// =============================================================================
// lib/queries/index.ts — All Supabase query helpers for IELS B2B Portal
// =============================================================================

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  UserProfile,
  School,
  DashboardData,
  ClassDetailData,
  StudentDetailData,
  ClassSummary,
  StudentSummary,
  ProgressSnapshot,
  Goal,
  Milestone,
  SkillScores,
  SkillBreakdown,
  SkillData,
  GoalCategory,
} from "@/lib/types";

// Tipe eksplisit buat ngasih tau TypeScript bentuk data dari Supabase
type SnapshotType = {
  student_id: string;
  speaking_score: number | null;
  writing_score: number | null;
  reading_score: number | null;
  listening_score: number | null;
  vocabulary_score: number | null;
  snapshot_date: string;
};

// ── Auth helper ───────────────────────────────────────────────────────────────

export async function getAuthUser(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as UserProfile | null;
}

// ── Skill breakdown helper ────────────────────────────────────────────────────
// Builds a SkillData object from an array of raw scores (0–100).

function buildSkillData(scores: number[]): SkillData {
  if (scores.length === 0) {
    return { avgScore: 0, atRiskCount: 0, topCount: 0 };
  }

  const avgScore    = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const atRiskCount = scores.filter((s) => s < 50).length;
  const topCount    = scores.filter((s) => s >= 75).length;

  const scoreDistribution: Record<string, number> = {
    "0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0,
  };
  scores.forEach((s) => {
    if      (s < 25)  scoreDistribution["0-25"]++;
    else if (s < 50)  scoreDistribution["25-50"]++;
    else if (s < 75)  scoreDistribution["50-75"]++;
    else              scoreDistribution["75-100"]++;
  });

  return { avgScore, atRiskCount, topCount, scoreDistribution };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Teacher profile
  const { data: teacher } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!teacher) return null;

  // Primary School info (buat badge di UI)
  const { data: school } = await supabase
    .from("b2b_schools")
    .select("*")
    .eq("id", teacher.school_id)
    .single();

  // Classes assigned to this teacher (lintas sekolah)
  const { data: teacherClasses } = await supabase
    .from("b2b_teacher_classes")
    .select("class_id")
    .eq("teacher_id", user.id);

  const classIds = teacherClasses?.map((tc: { class_id: string }) => tc.class_id) ?? [];

  let classes: ClassSummary[]  = [];
  let totalStudents            = 0;
  let avgSchoolGRS             = 0;
  let skillBreakdown: SkillBreakdown = {
    writing:    buildSkillData([]),
    speaking:   buildSkillData([]),
    reading:    buildSkillData([]),
    listening:  buildSkillData([]),
    vocabulary: buildSkillData([]),
    grammar:    buildSkillData([]),
  };

  if (classIds.length > 0) {
// ── 1. Bypass SQL View: Tarik langsung data kelas mentah ─────────────────
    // Tambahkan school_id, grade, major di select
    const { data: classData } = await supabase
      .from("b2b_classes")
      .select("id, name, enrollment_year, school_id, grade, major") 
      .in("id", classIds);

    // ── 2. Tarik semua data murid di kelas-kelas tersebut ────────────────────
    const { data: studentData } = await supabase
      .from("users")
      .select("id, class_id, subscription_role")
      .in("class_id", classIds)
      .eq("role", "STUDENT")
      .eq("is_active", true);

    const students = studentData ?? [];
    totalStudents = students.length;

    // ── 3. Tarik snapshot nilai untuk perhitungan ────────────────────────────
    const studentIds = students.map((s) => s.id);
    let typedSnapshots: SnapshotType[] = [];
    
    if (studentIds.length > 0) {
      const { data: snapshots } = await supabase
        .from("b2b_progress_snapshots")
        .select("student_id, speaking_score, writing_score, reading_score, listening_score, vocabulary_score, snapshot_date")
        .in("student_id", studentIds)
        .order("snapshot_date", { ascending: false });
        
      typedSnapshots = (snapshots as SnapshotType[]) ?? [];
    }

    // Deduplicate: ambil snapshot paling baru per murid
    const latestByStudent = new Map<string, SnapshotType>();
    for (const snap of typedSnapshots) {
      if (!latestByStudent.has(snap.student_id)) {
        latestByStudent.set(snap.student_id, snap);
      }
    }

  // ── 4. Rakit Class Summary secara manual pakai TypeScript ────────────────
    classes = (classData ?? []).map((cls) => {
      const classStudents = students.filter(s => s.class_id === cls.id);
      
      let totalGrs = 0;
      let grsCount = 0;

      classStudents.forEach(stu => {
        const snap = latestByStudent.get(stu.id);
        if (snap) {
          // Hitung rata-rata skor per murid untuk dapet GRS
          let sum = 0; let count = 0;
          if (snap.speaking_score != null) { sum += snap.speaking_score; count++; }
          if (snap.writing_score != null) { sum += snap.writing_score; count++; }
          if (snap.reading_score != null) { sum += snap.reading_score; count++; }
          if (snap.listening_score != null) { sum += snap.listening_score; count++; }
          if (snap.vocabulary_score != null) { sum += snap.vocabulary_score; count++; }
          
          if (count > 0) {
            totalGrs += (sum / count);
            grsCount++;
          }
        }
      });

      return {
        class_id: cls.id,
        school_id: cls.school_id, // <-- Tambahan
        class_name: cls.name,
        grade: cls.grade,         // <-- Tambahan
        major: cls.major,         // <-- Tambahan
        enrollment_year: cls.enrollment_year,
        total_students: classStudents.length,
        avg_readiness_score: grsCount > 0 ? Math.round(totalGrs / grsCount) : null,
        visionary_count: classStudents.filter(s => s.subscription_role === 'VISIONARY').length,
        insider_count: classStudents.filter(s => s.subscription_role === 'INSIDER').length,
        explorer_count: classStudents.filter(s => s.subscription_role === 'EXPLORER').length,
      };
    });
    // Urutkan kelas dari tahun terbaru
    classes.sort((a, b) => b.enrollment_year - a.enrollment_year);

    // Hitung rata-rata GRS global
    const validScores = classes
      .map((c) => c.avg_readiness_score)
      .filter((s): s is number => s !== null);

    avgSchoolGRS =
      validScores.length > 0
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : 0;

    // ── 5. Collect score arrays per skill untuk Radar Chart ──────────────────
    const latest = Array.from(latestByStudent.values());
    const writing:    number[] = [];
    const speaking:   number[] = [];
    const reading:    number[] = [];
    const listening:  number[] = [];
    const vocabulary: number[] = [];
    const grammar:    number[] = [];

    for (const snap of latest) {
      if (snap.writing_score    != null) writing.push(snap.writing_score);
      if (snap.speaking_score   != null) speaking.push(snap.speaking_score);
      if (snap.reading_score    != null) reading.push(snap.reading_score);
      if (snap.listening_score  != null) listening.push(snap.listening_score);
      if (snap.vocabulary_score != null) vocabulary.push(snap.vocabulary_score);

      // Grammar proxy: avg of writing + reading
      if (snap.writing_score != null && snap.reading_score != null) {
        grammar.push(Math.round((snap.writing_score + snap.reading_score) / 2));
      }
    }

    skillBreakdown = {
      writing:    buildSkillData(writing),
      speaking:   buildSkillData(speaking),
      reading:    buildSkillData(reading),
      listening:  buildSkillData(listening),
      vocabulary: buildSkillData(vocabulary),
      grammar:    buildSkillData(grammar),
    };
  }

  return {
    teacher: teacher as UserProfile,
    school:  school as School | null,
    classes,
    totalStudents,
    avgSchoolGRS,
    skillBreakdown,
  };
}

// ── Class Detail ──────────────────────────────────────────────────────────────

export async function getClassDetailData(
  classId: string
): Promise<ClassDetailData | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify teacher has access
  const { data: tc } = await supabase
    .from("b2b_teacher_classes")
    .select("class_id")
    .eq("teacher_id", user.id)
    .eq("class_id", classId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!tc && profile?.role !== "SCHOOL_ADMIN") return null;

  // Class info
  const { data: classInfo } = await supabase
    .from("b2b_classes")
    .select("*")
    .eq("id", classId)
    .single();

  // Students summary
  const { data: students } = await supabase
    .from("b2b_student_summary")
    .select("*")
    .eq("class_id", classId)
    .eq("is_active", true);

  const studentList = (students as StudentSummary[]) ?? [];

  // Latest snapshots for all students to compute avg skills
  const studentIds = studentList.map((s) => s.student_id);
  let avgSkills: SkillScores = {
    speaking: 0, writing: 0, reading: 0, listening: 0, vocabulary: 0,
  };

  if (studentIds.length > 0) {
    const { data: snapshots } = await supabase
      .from("b2b_progress_snapshots")
      .select("*")
      .in("student_id", studentIds)
      .order("snapshot_date", { ascending: false });

    // Only take latest per student
    const latestMap = new Map<string, ProgressSnapshot>();
    for (const snap of (snapshots as ProgressSnapshot[]) ?? []) {
      if (!latestMap.has(snap.student_id)) latestMap.set(snap.student_id, snap);
    }
    const latestSnaps = Array.from(latestMap.values());

    if (latestSnaps.length > 0) {
      const avg = (key: keyof ProgressSnapshot) =>
        Math.round(
          latestSnaps.reduce((s, snap) => s + ((snap[key] as number) ?? 0), 0) /
            latestSnaps.length
        );
      avgSkills = {
        speaking:   avg("speaking_score"),
        writing:    avg("writing_score"),
        reading:    avg("reading_score"),
        listening:  avg("listening_score"),
        vocabulary: avg("vocabulary_score"),
      };
    }
  }

  // At-risk: GRS < 30 or no active goal
  const atRiskStudents = studentList.filter(
    (s) => (s.global_readiness_score ?? 0) < 30 || !s.active_goal
  );

  // Top improvers: GRS >= 75
  const topImprovers = studentList
    .filter((s) => (s.global_readiness_score ?? 0) >= 75)
    .sort((a, b) => (b.global_readiness_score ?? 0) - (a.global_readiness_score ?? 0))
    .slice(0, 5);

  // Pathway distribution from active goals
  const categoryCount: Record<string, number> = {};
  studentList.forEach((s) => {
    if (s.active_goal) {
      categoryCount[s.active_goal.category] =
        (categoryCount[s.active_goal.category] ?? 0) + 1;
    }
  });
  const totalWithGoals = Object.values(categoryCount).reduce((a, b) => a + b, 0);
  const pathwayDistribution = Object.entries(categoryCount)
    .map(([category, count]) => ({
      category: category as GoalCategory,
      count,
      pct: totalWithGoals > 0 ? Math.round((count / totalWithGoals) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    classInfo,
    students: studentList,
    avgSkills,
    atRiskStudents,
    topImprovers,
    pathwayDistribution,
  };
}

// ── Student Detail ────────────────────────────────────────────────────────────

export async function getStudentDetailData(
  studentId: string
): Promise<StudentDetailData | null> {
  const supabase = await createSupabaseServerClient();

  const { data: student } = await supabase
    .from("users")
    .select("*")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const { data: classInfo } = student.class_id
    ? await supabase
        .from("b2b_classes")
        .select("*")
        .eq("id", student.class_id)
        .single()
    : { data: null };

  const { data: goals } = await supabase
    .from("b2b_goals")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const goalIds = (goals as Goal[])?.map((g) => g.id) ?? [];
  let milestones: Milestone[] = [];
  if (goalIds.length > 0) {
    const { data: m } = await supabase
      .from("b2b_milestones")
      .select("*")
      .in("goal_id", goalIds);
    milestones = (m as Milestone[]) ?? [];
  }

  const { data: snapshots } = await supabase
    .from("b2b_progress_snapshots")
    .select("*")
    .eq("student_id", studentId)
    .order("snapshot_date", { ascending: true });

  const snapshotList    = (snapshots as ProgressSnapshot[]) ?? [];
  const latestSnapshot  = snapshotList.at(-1) ?? null;

  return {
    student:        student as UserProfile,
    classInfo:      classInfo ?? null,
    goals:          (goals as Goal[]) ?? [],
    milestones,
    snapshots:      snapshotList,
    latestSnapshot,
  };
}

// ── All students for a class ──────────────────────────────────────────────────

export async function getClassStudents(classId: string): Promise<StudentSummary[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("b2b_student_summary")
    .select("*")
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("global_readiness_score", { ascending: false });

  return (data as StudentSummary[]) ?? [];
}
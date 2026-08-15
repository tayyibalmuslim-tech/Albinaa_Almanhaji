// بيانات المشروع - يمكن إضافة مراحل جديدة هنا لاحقًا (انظر ملف README)
const SITE_DATA = {
  stages: {
    stage1: {
      id: "stage1",
      name: "المرحلة الأولى",
      subjects: [
        { key: "nahw", name: "مدخل إلى علم النحو", sheikh: "سالم القحطاني", tags: ["مداخل_العلوم"], lectures: [
          { id: "stage1_nahw_01", n: 1, day: 1, title: "محاضرة كاملة", file: "lectures/01.html" }
        ]},
        { key: "fiqh", name: "مدخل إلى علم الفقه", sheikh: "عامر بهجت", tags: ["مداخل_العلوم"], lectures: [
          { id: "stage1_fiqh_01", n: 1, day: 2, title: "المحاضرة 1", file: "lectures/01.html" },
          { id: "stage1_fiqh_02", n: 2, day: 3, title: "المحاضرة 2", file: "lectures/02.html" },
          { id: "stage1_fiqh_05", n: 3, day: 8, title: "المحاضرة 3", file: "lectures/05.html" },
          { id: "stage1_fiqh_06", n: 4, day: 9, title: "المحاضرة 4", file: "lectures/06.html" },
          { id: "stage1_fiqh_07", n: 5, day: 10, title: "المحاضرة 5", file: "lectures/07.html" },
          { id: "stage1_fiqh_08", n: 6, day: 15, title: "المحاضرة 6", file: "lectures/08.html" },
          { id: "stage1_fiqh_09", n: 7, day: 16, title: "المحاضرة 7", file: "lectures/09.html" }
        ]},
        { key: "hadith", name: "مدخل إلى علم الحديث", sheikh: "أحمد السيد", tags: ["مداخل_العلوم"], lectures: [
          { id: "stage1_hadith_01", n: 1, day: 29, title: "المحاضرة الأولى 1/3", file: "lectures/01.html" },
          { id: "stage1_hadith_02", n: 2, day: 32, title: "المحاضرة الأولى 2/3", file: "lectures/02.html" },
          { id: "stage1_hadith_03", n: 3, day: 33, title: "المحاضرة الأولى 3/3", file: "lectures/03.html" },
          { id: "stage1_hadith_04", n: 4, day: 34, title: "المحاضرة الثانية 1/2", file: "lectures/04.html" },
          { id: "stage1_hadith_05", n: 5, day: 39, title: "المحاضرة الثانية 2/2", file: "lectures/05.html" }
        ]},
        { key: "quran-sciences", name: "مدخل إلى علوم القرآن", sheikh: "أحمد السيد", tags: ["مداخل_العلوم"], lectures: [
          { id: "stage1_quran-sciences_01", n: 1, day: 17, title: "المحاضرة 1", file: "lectures/01.html" },
          { id: "stage1_quran-sciences_02", n: 2, day: 22, title: "المحاضرة 2", file: "lectures/02.html" }
        ]},
        { key: "aqeedah", name: "مدخل إلى علم العقيدة", sheikh: "أحمد السيد", tags: ["مداخل_العلوم"], lectures: [
          { id: "stage1_aqeedah_01", n: 1, day: 23, title: "المحاضرة 1", file: "lectures/01.html" },
          { id: "stage1_aqeedah_02", n: 2, day: 24, title: "المحاضرة 2", file: "lectures/02.html" }
        ]},
        { key: "anwar-al-anbiya", name: "أنوار الأنبياء", sheikh: "أحمد السيد", tags: ["المنهج_الإصلاحي", "التزكية"], lectures: [
          { id: "stage1_anwar-al-anbiya_01", n: 1, day: 4, title: "من بداية الكتاب إلى ص 34", file: "lectures/03.html" },
          { id: "stage1_anwar-al-anbiya_02", n: 2, day: 5, title: "من 35 إلى 61", file: "lectures/04.html" },
          { id: "stage1_anwar-al-anbiya_03", n: 3, day: 11, title: "من 63 إلى 93", file: "lectures/01.html" },
          { id: "stage1_anwar-al-anbiya_04", n: 4, day: 12, title: "من 95 إلى نهاية الكتاب", file: "lectures/02.html" }
        ]},
        { key: "riyad-al-saliheen", name: "شرح رياض الصالحين", sheikh: "غير محدد حاليًا", tags: ["المنهج_الإصلاحي", "التزكية", "علم_شرعي"], lectures: [
          { id: "stage1_riyad-al-saliheen_01", n: 1, day: 6, title: "باب الإخلاص والنية 1", file: "lectures/01.html" },
          { id: "stage1_riyad-al-saliheen_02", n: 2, day: 13, title: "باب الإخلاص والنية 2", file: "lectures/02.html" },
          { id: "stage1_riyad-al-saliheen_03", n: 3, day: 20, title: "باب التوبة 1", file: "lectures/03.html" },
          { id: "stage1_riyad-al-saliheen_04", n: 4, day: 27, title: "باب التوبة 1", file: "lectures/04.html" },
          { id: "stage1_riyad-al-saliheen_05", n: 5, day: 40, title: "باب التوبة 2", file: "lectures/05.html" },
          { id: "stage1_riyad-al-saliheen_06", n: 6, day: 41, title: "باب التوبة 3", file: "lectures/06.html" }
        ]},
        { key: "sharaya-wasael-maqasid", name: "العلوم الشرعية بين الوسائل والمقاصد", sheikh: "أحمد السيد", tags: ["علم_شرعي", "تزكية"], lectures: [
          { id: "stage1_sharaya-wasael-maqasid_01", n: 1, day: 18, title: "محاضرة كاملة", file: "lectures/01.html" }
        ]},
        { key: "raqaeq-al-quran", name: "رقائق القرآن", sheikh: "إبراهيم السكران", tags: ["علم_شرعي", "تزكية"], lectures: [
          { id: "stage1_raqaeq-al-quran_01", n: 1, day: 19, title: "من البداية إلى ص 33", file: "lectures/01.html" },
          { id: "stage1_raqaeq-al-quran_02", n: 2, day: 25, title: "من 34 إلى 53", file: "lectures/02.html" },
          { id: "stage1_raqaeq-al-quran_03", n: 3, day: 26, title: "من 54 إلى 78", file: "lectures/03.html" },
          { id: "stage1_raqaeq-al-quran_04", n: 4, day: 30, title: "من 109 إلى 133", file: "lectures/04.html" },
          { id: "stage1_raqaeq-al-quran_05", n: 5, day: 31, title: "من 135 إلى النهاية", file: "lectures/05.html" }
        ]},
        { key: "mu_alajat-al-quran", name: "معالجة القرآن لنفوس المصلحين", sheikh: "أحمد السيد", tags: ["المنهج_الإصلاحي"], lectures: [
          { id: "stage1_mu_alajat-al-quran_01", n: 1, day: 35, title: "من بداية الكتاب إلى ص 31", file: "lectures/01.html" },
          { id: "stage1_mu_alajat-al-quran_02", n: 2, day: 36, title: "من 32 إلى ص 58", file: "lectures/02.html" },
          { id: "stage1_mu_alajat-al-quran_03", n: 3, day: 37, title: "من 59 إلى نهاية الكتاب", file: "lectures/03.html" }
        ]}
      ],
      days: [
        { day: 1, kind: "lecture", lectureId: "stage1_nahw_01", subjectKey: "nahw", subjectName: "مدخل إلى علم النحو", title: "محاضرة كاملة", link: "nahw/lectures/01.html" },
        { day: 2, kind: "lecture", lectureId: "stage1_fiqh_01", subjectKey: "fiqh", subjectName: "مدخل إلى علم الفقه", title: "المحاضرة 1", link: "fiqh/lectures/01.html" },
        { day: 3, kind: "lecture", lectureId: "stage1_fiqh_02", subjectKey: "fiqh", subjectName: "مدخل إلى علم الفقه", title: "المحاضرة 2", link: "fiqh/lectures/02.html" },
        { day: 4, kind: "lecture", lectureId: "stage1_anwar-al-anbiya_01", subjectKey: "anwar-al-anbiya", subjectName: "أنوار الأنبياء", title: "من بداية الكتاب إلى ص 34", link: "anwar-al-anbiya/lectures/03.html" },
        { day: 5, kind: "lecture", lectureId: "stage1_anwar-al-anbiya_02", subjectKey: "anwar-al-anbiya", subjectName: "أنوار الأنبياء", title: "من 35 إلى 61", link: "anwar-al-anbiya/lectures/04.html" },
        { day: 6, kind: "lecture", lectureId: "stage1_riyad-al-saliheen_01", subjectKey: "riyad-al-saliheen", subjectName: "شرح رياض الصالحين", title: "باب الإخلاص والنية 1", link: "riyad-al-saliheen/lectures/01.html" },
        { day: 7, kind: "rest", id: "stage1_day_07", title: "استدراك وراحة" },
        { day: 8, kind: "lecture", lectureId: "stage1_fiqh_05", subjectKey: "fiqh", subjectName: "مدخل إلى علم الفقه", title: "المحاضرة 3", link: "fiqh/lectures/05.html" },
        { day: 9, kind: "lecture", lectureId: "stage1_fiqh_06", subjectKey: "fiqh", subjectName: "مدخل إلى علم الفقه", title: "المحاضرة 4", link: "fiqh/lectures/06.html" },
        { day: 10, kind: "lecture", lectureId: "stage1_fiqh_07", subjectKey: "fiqh", subjectName: "مدخل إلى علم الفقه", title: "المحاضرة 5", link: "fiqh/lectures/07.html" },
        { day: 11, kind: "lecture", lectureId: "stage1_anwar-al-anbiya_03", subjectKey: "anwar-al-anbiya", subjectName: "أنوار الأنبياء", title: "من 63 إلى 93", link: "anwar-al-anbiya/lectures/01.html" },
        { day: 12, kind: "lecture", lectureId: "stage1_anwar-al-anbiya_04", subjectKey: "anwar-al-anbiya", subjectName: "أنوار الأنبياء", title: "من 95 إلى نهاية الكتاب", link: "anwar-al-anbiya/lectures/02.html" },
        { day: 13, kind: "lecture", lectureId: "stage1_riyad-al-saliheen_02", subjectKey: "riyad-al-saliheen", subjectName: "شرح رياض الصالحين", title: "باب الإخلاص والنية 2", link: "riyad-al-saliheen/lectures/02.html" },
        { day: 14, kind: "rest", id: "stage1_day_14", title: "استدراك وراحة" },
        { day: 15, kind: "lecture", lectureId: "stage1_fiqh_08", subjectKey: "fiqh", subjectName: "مدخل إلى علم الفقه", title: "المحاضرة 6", link: "fiqh/lectures/08.html" },
        { day: 16, kind: "lecture", lectureId: "stage1_fiqh_09", subjectKey: "fiqh", subjectName: "مدخل إلى علم الفقه", title: "المحاضرة 7", link: "fiqh/lectures/09.html" },
        { day: 17, kind: "lecture", lectureId: "stage1_quran-sciences_01", subjectKey: "quran-sciences", subjectName: "مدخل إلى علوم القرآن", title: "المحاضرة 1", link: "quran-sciences/lectures/01.html" },
        { day: 18, kind: "lecture", lectureId: "stage1_sharaya-wasael-maqasid_01", subjectKey: "sharaya-wasael-maqasid", subjectName: "العلوم الشرعية بين الوسائل والمقاصد", title: "محاضرة كاملة", link: "sharaya-wasael-maqasid/lectures/01.html" },
        { day: 19, kind: "lecture", lectureId: "stage1_raqaeq-al-quran_01", subjectKey: "raqaeq-al-quran", subjectName: "رقائق القرآن", title: "من البداية إلى ص 33", link: "raqaeq-al-quran/lectures/01.html" },
        { day: 20, kind: "lecture", lectureId: "stage1_riyad-al-saliheen_03", subjectKey: "riyad-al-saliheen", subjectName: "شرح رياض الصالحين", title: "باب التوبة 1", link: "riyad-al-saliheen/lectures/03.html" },
        { day: 21, kind: "rest", id: "stage1_day_21", title: "استدراك وراحة" },
        { day: 22, kind: "lecture", lectureId: "stage1_quran-sciences_02", subjectKey: "quran-sciences", subjectName: "مدخل إلى علوم القرآن", title: "المحاضرة 2", link: "quran-sciences/lectures/02.html" },
        { day: 23, kind: "lecture", lectureId: "stage1_aqeedah_01", subjectKey: "aqeedah", subjectName: "مدخل إلى علم العقيدة", title: "المحاضرة 1", link: "aqeedah/lectures/01.html" },
        { day: 24, kind: "lecture", lectureId: "stage1_aqeedah_02", subjectKey: "aqeedah", subjectName: "مدخل إلى علم العقيدة", title: "المحاضرة 2", link: "aqeedah/lectures/02.html" },
        { day: 25, kind: "lecture", lectureId: "stage1_raqaeq-al-quran_02", subjectKey: "raqaeq-al-quran", subjectName: "رقائق القرآن", title: "من 34 إلى 53", link: "raqaeq-al-quran/lectures/02.html" },
        { day: 26, kind: "lecture", lectureId: "stage1_raqaeq-al-quran_03", subjectKey: "raqaeq-al-quran", subjectName: "رقائق القرآن", title: "من 54 إلى 78", link: "raqaeq-al-quran/lectures/03.html" },
        { day: 27, kind: "lecture", lectureId: "stage1_riyad-al-saliheen_04", subjectKey: "riyad-al-saliheen", subjectName: "شرح رياض الصالحين", title: "باب التوبة 1", link: "riyad-al-saliheen/lectures/04.html" },
        { day: 28, kind: "rest", id: "stage1_day_28", title: "استدراك وراحة" },
        { day: 29, kind: "lecture", lectureId: "stage1_hadith_01", subjectKey: "hadith", subjectName: "مدخل إلى علم الحديث", title: "المحاضرة الأولى 1/3", link: "hadith/lectures/01.html" },
        { day: 30, kind: "lecture", lectureId: "stage1_raqaeq-al-quran_04", subjectKey: "raqaeq-al-quran", subjectName: "رقائق القرآن", title: "من 109 إلى 133", link: "raqaeq-al-quran/lectures/04.html" },
        { day: 31, kind: "lecture", lectureId: "stage1_raqaeq-al-quran_05", subjectKey: "raqaeq-al-quran", subjectName: "رقائق القرآن", title: "من 135 إلى النهاية", link: "raqaeq-al-quran/lectures/05.html" },
        { day: 32, kind: "lecture", lectureId: "stage1_hadith_02", subjectKey: "hadith", subjectName: "مدخل إلى علم الحديث", title: "المحاضرة الأولى 2/3", link: "hadith/lectures/02.html" },
        { day: 33, kind: "lecture", lectureId: "stage1_hadith_03", subjectKey: "hadith", subjectName: "مدخل إلى علم الحديث", title: "المحاضرة الأولى 3/3", link: "hadith/lectures/03.html" },
        { day: 34, kind: "lecture", lectureId: "stage1_hadith_04", subjectKey: "hadith", subjectName: "مدخل إلى علم الحديث", title: "المحاضرة الثانية 1/2", link: "hadith/lectures/04.html" },
        { day: 35, kind: "lecture", lectureId: "stage1_mu_alajat-al-quran_01", subjectKey: "mu_alajat-al-quran", subjectName: "معالجة القرآن لنفوس المصلحين", title: "من بداية الكتاب إلى ص 31", link: "mu_alajat-al-quran/lectures/01.html" },
        { day: 36, kind: "lecture", lectureId: "stage1_mu_alajat-al-quran_02", subjectKey: "mu_alajat-al-quran", subjectName: "معالجة القرآن لنفوس المصلحين", title: "من 32 إلى ص 58", link: "mu_alajat-al-quran/lectures/02.html" },
        { day: 37, kind: "lecture", lectureId: "stage1_mu_alajat-al-quran_03", subjectKey: "mu_alajat-al-quran", subjectName: "معالجة القرآن لنفوس المصلحين", title: "من 59 إلى نهاية الكتاب", link: "mu_alajat-al-quran/lectures/03.html" },
        { day: 38, kind: "rest", id: "stage1_day_38", title: "استدراك وراحة" },
        { day: 39, kind: "lecture", lectureId: "stage1_hadith_05", subjectKey: "hadith", subjectName: "مدخل إلى علم الحديث", title: "المحاضرة الثانية 2/2", link: "hadith/lectures/05.html" },
        { day: 40, kind: "lecture", lectureId: "stage1_riyad-al-saliheen_05", subjectKey: "riyad-al-saliheen", subjectName: "شرح رياض الصالحين", title: "باب التوبة 2", link: "riyad-al-saliheen/lectures/05.html" },
        { day: 41, kind: "lecture", lectureId: "stage1_riyad-al-saliheen_06", subjectKey: "riyad-al-saliheen", subjectName: "شرح رياض الصالحين", title: "باب التوبة 3", link: "riyad-al-saliheen/lectures/06.html" },
        { day: 42, kind: "rest", id: "stage1_day_42", title: "استدراك وراحة" },
        { day: 43, kind: "rest", id: "stage1_day_43", title: "استدراك وراحة" },
        { day: 44, kind: "rest", id: "stage1_day_44", title: "استدراك وراحة" },
        { day: 45, kind: "rest", id: "stage1_day_45", title: "استدراك وراحة" },
        { day: 46, kind: "rest", id: "stage1_day_46", title: "استدراك وراحة" },
        { day: 47, kind: "rest", id: "stage1_day_47", title: "استدراك وراحة" },
        { day: 48, kind: "exam", id: "stage1_day_48", title: "اختبار المرحلة" }
      ],
      totalLectures: 36
    }
  }
};

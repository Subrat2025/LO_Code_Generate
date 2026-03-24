# LO Compilation Format Generator
**School / Cluster / Block Level**

A production-ready web application for generating official **Format-A** Learning Outcome (LO) compilation sheets. Supports School, Cluster, and Block level reports, bilingual (English + Odia), and exports to Print/PDF/Excel/CSV.

---

## ✅ Completed Features

### 1. Dashboard (Home)
- School metadata configuration: District, Block, Cluster, School, Class, Subject, Exam, Year, Language (en/od)
- Save configuration to backend (`school_entries` table)
- Load / Delete previously saved reports
- Dashboard stats: Blueprint items, Students, Total Marks, LO Codes, Avg LO %
- 5-step visual workflow guide

### 2. Blueprint Builder
- **Manual entry**: Row-by-row with Q.Label (Odia ✓), Section (Written/Oral/Both), LO Code (free-text + autocomplete datalist), Marks
- **Full Manual Entry Table**: **Auto-generated immediately after Q-LO mapping** — shows all questions per column, grouped by LO code in rows. Includes section banners (Written/Oral), LO codes, serial numbers, question labels, allotted marks, and totals. Updates live on every change.
- **Print button**: Print the full entry table from the blueprint page
- **Bulk upload**: Drag-and-drop or browse `.xlsx` / `.csv` file
- **Paste CSV**: Paste text in `Q_Label,Section,LO_Code,Marks` format
- **Template downloads**: Excel and CSV templates with sample rows
- **LO Code Reference panel**: Searchable grid of all LO codes (filter by current subject or all), click to append to blueprint
- **Add New LO Code**: Save custom LO codes (English + Odia) to the shared database for all schools
- **Shared Blueprint Library**: Save your completed blueprint to the backend; any school with same Class+Subject can load it instantly
- **Generate Format Excel**: Downloadable 3-sheet workbook: LO Codes Master, Current Class/Subject LO Codes, Blueprint Q-LO Map
- **Clear All / Load Sample** (Class IV Mathematics, 36 items)

### 3. Student Roster
- Add students one by one (Roll No + Name, supports Odia names)
- Bulk import by pasting: `Roll,Name` or just `Name` per line
- Load 10 sample students
- Delete individual or clear all

### 4. Marks Entry  *(redesigned as per DIET Ganjam specification)*
- **Portrait orientation**: Students listed vertically (rows), questions horizontally (columns)
- **Section ordering**: ALL Written questions (serial 1 to n) appear first, then ALL Oral questions (serial 1 to n)
- **Section banners**: Blue banner for "WRITTEN QUESTIONS (Q.1 to n)", Purple banner for "ORAL QUESTIONS (Q.1 to n)"
- **LO Code grouping**: Within each section, questions are visually grouped under their LO Code column header
- **Serial numbers**: Each question column shows its serial number within its section (W1, W2… | O1, O2…) plus the original question label
- **Max-mark validation**: Entering a value > max triggers a red error toast, clears the field, and shows a 2-second red border
- Keyboard navigation: Tab/Enter (next), Arrow keys (directional), A = Absent (highlighted yellow)
- Live totals: Per-question column total, Max Possible, Q-wise %, LO-wise % per LO group, Grand total per student
- Save Marks to backend
- Clear All marks

### 5. Format-A Report (Preview & Export)
- **Official layout – 1 column per LO code** (not per question):
  - No "DIET Ganjam, Khallikote" heading (removed)
  - Title: `SCHOOL LEVEL COMPILATION FORMAT FOR [EXAM] RESULT ANALYSIS [YEAR]`
  - Metadata row: District, Block, Cluster, School, Class, Subject
  - **4-row table header**:
    1. LO Code (bold, one column per LO)
    2. Written Q. Nos. (comma-separated serials, e.g. `W: 1, 3, 5`)
    3. Oral Q. Nos. (comma-separated serials, e.g. `O: 2, 4`)
    4. Total Allotted Marks (W + O combined per LO)
  - Student rows: marks per LO (sum of all W+O questions for that LO)
  - **Total Marks of Students** row
  - **Max Possible** row (students × allotted)
  - **LO Wise Percentage** row
  - NB: Formula explanation + section key (W = Written, O = Oral)
  - HM Signature block
  - **LO Summary Page**: LO Code, Written Q Nos, Oral Q Nos, Allotted/Student, Total Obtained, Max Possible, Achievement %, Level
- Auto-pagination: up to 12 LO columns per A4 landscape page
- Fonts: Calibri/Arial, plain black borders (no color fills) — matches official format
- **Export Print**: Opens new window with embedded CSS, A4 landscape
- **Export PDF**: jsPDF + autoTable, A4 landscape, multi-page
- **Export Excel**: SheetJS, 2 sheets (Format-A + LO Summary)
- **Export CSV**: BOM-encoded for Excel compatibility with Odia support

### 6. Cluster-Level Report
- Filter by Block, Cluster, Class, Subject, Exam, Year
- Aggregates all matching school entries
- School-wise LO achievement % table
- Average row across all schools
- Export PDF and Excel

### 7. Block-Level Report
- Filter by Block, Class, Subject, Exam, Year
- Aggregates all schools in the block
- Export PDF and Excel

### 8. Bilingual Support
- All LO codes have English + Odia descriptions
- Student names accept Odia (Noto Sans Oriya font)
- Question labels accept Odia numerals (e.g. ୧(କ), ୬(ଖ))
- Odia–English label mapping: ক→a, ଖ→b, ୧→1, ୨→2, etc.

---

## 📁 File Structure

```
index.html          Main page with all sections
css/style.css       Complete stylesheet (Calibri/plain official format)
js/app.js           State, API, navigation, calculations
js/blueprint.js     Blueprint builder (manual, bulk, library)
js/students.js      Student roster management
js/marks.js         LO-grouped marks entry (Written 1..n | Oral 1..n)
js/preview.js       Format-A render, Print/PDF/Excel/CSV export
js/aggregate.js     Cluster & Block level aggregate reports
```

## 🗃️ Database Tables

| Table | Fields | Purpose |
|-------|--------|---------|
| `school_entries` | district, block, cluster, school, class, subject, exam, year, lang, items (JSON), students (JSON), total_students, total_marks_possible | Saves full school report data |
| `lo_codes` | lo_code, lo_description, lo_description_odia, subject, class | Shared LO code master list (seeded with Classes I–VIII) |
| `bp_library` | class, subject, exam, year, school, items (JSON) | Shared blueprint library for cross-school reuse |

## 🔗 API Endpoints Used

- `GET /tables/school_entries?limit=500` — Load all saved reports
- `POST /tables/school_entries` — Save new report
- `PATCH /tables/school_entries/{id}` — Update existing report
- `DELETE /tables/school_entries/{id}` — Delete report
- `GET /tables/lo_codes?limit=500` — Load all LO codes
- `POST /tables/lo_codes` — Add new LO code
- `GET /tables/bp_library?limit=500` — Load shared blueprints
- `POST /tables/bp_library` — Share blueprint
- `PATCH /tables/bp_library/{id}` — Update shared blueprint
- `DELETE /tables/bp_library/{id}` — Remove from library

## 📋 LO Codes Seeded

- **Mathematics**: Classes I (5), II (5), III (5), IV (21), V (7), VI (6), VII (5), VIII (5)
- **English**: Classes IV (7), V (3)
- **Odia**: Classes IV (6), V (2)
- **EVS**: Class IV (7)
- **Science**: Class VI (4)

## 🔑 Marks Table Layout Logic

```
HEADER ROW 0:  [──── WRITTEN QUESTIONS (Q.1 to 26) ────] [──── ORAL QUESTIONS (Q.1 to 10) ────]
HEADER ROW 1:  [  M401 (4 cols) ] [M412 (3 cols)] ...    [  M402 (2 cols)] ...
HEADER ROW 2:  [1] [2] [3] [4]    [5] [6] [7]   ...      [1]  [2]   ...
HEADER ROW 3:  [2] [1] [2] [2]    [2] [2] [1]   ...      [2]  [2]   ...
STUDENT ROW:   Sl  Name  m  m  m   m  m  m  m  ...  m   m    Total
```

## 🖨️ Format-A Report Layout Logic

```
                    SCHOOL LEVEL COMPILATION FORMAT FOR SA-II RESULT ANALYSIS 2025-26
                                            FORMAT – A
DISTRICT: GANJAM  | BLOCK: ... | CLUSTER: ... | SCHOOL: ... | CLASS: IV | SUBJECT: Mathematics

+----+------------------+--------+--------+--------+--------+--------+-------+
| Sl | Name             | M401   | M409   | M412   | M403   | M406   | Grand |
|    |                  | W:1,3,5| W:2,4  | W:6,7  | W:8    | W:9,10 | Total |
|    |                  | O:—    | O:1,2  | O:3,4,5| O:6    | O:—    |       |
|    |                  |   7    |   6    |   9    |   6    |   5    |       |
+----+------------------+--------+--------+--------+--------+--------+-------+
|  1 | Student Name     |   5    |   4    |   7    |   5    |   4    |  25   |
|  2 | ...              |  ...   |  ...   |  ...   |  ...   |  ...   |  ...  |
+----+------------------+--------+--------+--------+--------+--------+-------+
|    | Total Marks      |  ...   |  ...   |  ...   |  ...   |  ...   |  ...  |
|    | Max Possible     |  ...   |  ...   |  ...   |  ...   |  ...   |  ...  |
|    | LO Wise %        |  83%   |  76%   |  91%   |  70%   |  80%   |       |
+----+------------------+--------+--------+--------+--------+--------+-------+
NB: W=Written, O=Oral. LO wise % = Total obtained × 100 / (Students × Allotted Marks)
```

## ⚠️ Not Yet Implemented / Future Enhancements

- School-level user authentication and per-school data isolation
- Auto-generation of Odia text report title headings
- SMS/email notification on report completion
- Historical trend graphs across multiple exam cycles
- Offline/PWA mode for schools with poor connectivity
- Mobile-optimised marks entry with swipe support

## 🚀 To Deploy

Go to the **Publish tab** to make this website live with one click.

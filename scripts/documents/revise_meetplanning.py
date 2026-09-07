from copy import deepcopy
from pathlib import Path
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SRC = Path(r"P:\MeetPlanning\MeetPlanning_2-Sep_14.00_original.docx")
OUT = Path(r"P:\MeetPlanning\MeetPlanning_ฉบับแก้ไข_2-Sep.docx")


def set_paragraph_text_preserve_first_run(p, text):
    runs = list(p.runs)
    if runs:
        runs[0].text = text
        for r in runs[1:]:
            r.text = ""
    else:
        p.add_run(text)


def delete_paragraph(p):
    el = p._element
    el.getparent().remove(el)


def set_cell_text(cell, text):
    p = cell.paragraphs[0]
    set_paragraph_text_preserve_first_run(p, text)
    for extra in cell.paragraphs[1:]:
        delete_paragraph(extra)


def add_note_after_table(table, text):
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    pStyle = OxmlElement("w:pStyle")
    pStyle.set(qn("w:val"), "Normal")
    pPr.append(pStyle)
    p.append(pPr)
    r = OxmlElement("w:r")
    t = OxmlElement("w:t")
    t.text = text
    r.append(t)
    p.append(r)
    table._tbl.addnext(p)


doc = Document(SRC)

# 1) Standardize the full Thai project title where it is used as a title/name.
replacements = [
    ("MeetPlanning : ระบบจองและจัดหาห้องประชุมประชุม", "MeetPlanning : ระบบจองและจัดหาห้องประชุม"),
    ("MeetPlanning : ระบบจองและจัดหาห้อง", "MeetPlanning : ระบบจองและจัดหาห้องประชุม"),
    ("MeetPlanning ระบบจองและจัดการห้องประชุม", "MeetPlanning : ระบบจองและจัดหาห้องประชุม"),
    ("MeetPlanning ระบบจองและจัดหาห้องประชุม", "MeetPlanning : ระบบจองและจัดหาห้องประชุม"),
]

for p in doc.paragraphs:
    text = p.text
    new = text
    for old, repl in replacements:
        new = new.replace(old, repl)
    if new != text:
        set_paragraph_text_preserve_first_run(p, new)

for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                text = p.text
                new = text
                for old, repl in replacements:
                    new = new.replace(old, repl)
                if new != text:
                    set_paragraph_text_preserve_first_run(p, new)

# 2) Remove former section 2.5 (satisfaction theory) because this project has
# no sample group/satisfaction data, then shift 2.6 -> 2.5 and 2.7 -> 2.6.
paras = doc.paragraphs
start = next(i for i, p in enumerate(paras) if p.text.strip().startswith("2.5") and "ความพึงพอใจ" in p.text and i > 300)
end = next(i for i, p in enumerate(paras) if p.text.strip().startswith("2.6") and i > start)
for p in paras[start:end]:
    delete_paragraph(p)

for p in list(doc.paragraphs):
    s = p.text.strip()
    if s.startswith("2.5") and "ความพึงพอใจ" in s:
        delete_paragraph(p)
        continue
    if s.startswith("2.6") and "งานวิจัยที่เกี่ยวข้อง" in s:
        set_paragraph_text_preserve_first_run(p, p.text.replace("2.6", "2.5", 1))
    elif s.startswith("2.7") and "กรอบแนวคิด" in s:
        set_paragraph_text_preserve_first_run(p, p.text.replace("2.7", "2.6", 1))

# 3) Correct the numbering under 3.3.
subheads = {
    "โครงงานซอฟต์แวร์": "3.3.1 โครงงานซอฟต์แวร์",
    "Use Case Diagram": "3.3.1.1 Use Case Diagram",
    "Activity Diagram": "3.3.1.2 Activity Diagram",
    "Flowchart": "3.3.1.3 Flowchart",
    "ER Diagram": "3.3.1.4 ER Diagram",
    "Database Design": "3.3.1.5 Database Design",
    "User Interface": "3.3.1.6 User Interface",
}
for p in doc.paragraphs:
    key = p.text.strip()
    if key in subheads:
        set_paragraph_text_preserve_first_run(p, subheads[key])

# 4) Expand Table 3.8 to match the functional coverage stated in the abstract.
t38 = doc.tables[7]
while len(t38.rows) < 8:
    t38._tbl.append(deepcopy(t38.rows[-1]._tr))
t38_data = [
    ["รายการทดสอบ", "ผลที่คาดหวัง", "ผลการทดสอบ"],
    ["สมัครสมาชิก", "สร้างบัญชีผู้ใช้งานได้สำเร็จ", "ผ่าน"],
    ["เข้าสู่ระบบ (Login)", "เข้าสู่ระบบและแสดงเมนูตามสิทธิ์", "ผ่าน"],
    ["ค้นหาห้องประชุม", "แสดงห้องที่ตรงตามเงื่อนไข", "ผ่าน"],
    ["ส่งคำขอจอง", "บันทึกคำขอและแสดงสถานะรออนุมัติ", "ผ่าน"],
    ["ป้องกันการจองเวลาซ้ำ", "ไม่อนุญาตให้จองห้องในช่วงเวลาที่ทับซ้อน", "ผ่าน"],
    ["อนุมัติ/ปฏิเสธ", "ผู้มีสิทธิ์อนุมัติหรือปฏิเสธคำขอได้", "ผ่าน"],
    ["แจ้งสถานะ", "ผู้ใช้ตรวจสอบสถานะรายการจองได้", "ผ่าน"],
]
for row, vals in zip(t38.rows, t38_data):
    for cell, value in zip(row.cells, vals):
        set_cell_text(cell, value)

# 5) Clarify that Table 3.9 contains acceptance thresholds, not measured times.
t39 = doc.tables[8]
set_cell_text(t39.rows[0].cells[2], "เกณฑ์เวลาตอบสนองสูงสุด (วินาที)")
set_cell_text(t39.rows[0].cells[3], "ผลเทียบเกณฑ์")
for row, value in zip(t39.rows[1:4], ["ไม่เกิน 1 วินาที", "ไม่เกิน 2 วินาที", "ไม่เกิน 1 วินาที"]):
    set_cell_text(row.cells[2], value)

# 6) Table 4.2: do not call a single Login observation an average.
t42 = doc.tables[10]
set_cell_text(t42.rows[0].cells[2], "เวลาตอบสนองที่รายงาน")
add_note_after_table(
    t42,
    "หมายเหตุ: รายการเข้าสู่ระบบทดสอบ 1 ครั้ง จึงรายงานเป็นเวลาที่วัดได้ ไม่ใช่ค่าเฉลี่ย; รายการอื่นเป็นค่าเฉลี่ยจากการทดสอบ 10 ครั้ง",
)

# 7) Add bibliography records for sources cited in Chapter 2. The ISO citation
# is corrected to the actual edition year (2019), and the removed satisfaction
# section's Yurarat citation is no longer part of Chapter 2.
for p in doc.paragraphs:
    if "(ISO 9241-210, 2025)" in p.text:
        set_paragraph_text_preserve_first_run(p, p.text.replace("(ISO 9241-210, 2025)", "(ISO 9241-210, 2019)"))

refs_heading = next(p for p in doc.paragraphs if p.text.strip() == "References")
insert_before = next(p for p in doc.paragraphs if p.text.strip() == "เว็บไซต์")
refs = [
    "Apache Friends. (2025). About the XAMPP project. Retrieved from https://www.apachefriends.org/about.html",
    "Express.js. (2025). Express web framework documentation. Retrieved from https://expressjs.com/",
    "Google Material Design. (2024). Material Design 3: Layout foundations. Retrieved from https://m3.material.io/foundations/layout/understanding-layout/overview",
    "Google UX Research. (2025). The designer’s guide to accessibility research. Retrieved from https://design.google/library/designers-guide-accessibility-research",
    "International Organization for Standardization. (2019). ISO 9241-210:2019 Ergonomics of human-system interaction—Part 210: Human-centred design for interactive systems. Retrieved from https://www.iso.org/standard/77520.html",
    "MDN Web Docs. (2024). Fundamental text and font styling. Retrieved from https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Text_styling/Fundamentals",
    "MDN Web Docs. (2025). HTML: HyperText Markup Language. Retrieved from https://developer.mozilla.org/en-US/docs/Web/HTML",
    "Microsoft. (2025). Visual Studio Code documentation. Retrieved from https://code.visualstudio.com/docs",
    "Nielsen Norman Group. (2025). Usability guidelines for accessible web design. Retrieved from https://www.nngroup.com/reports/usability-guidelines-accessible-web-design/",
    "Node.js. (2025). About Node.js. Retrieved from https://nodejs.org/en/about/",
    "Oracle Corporation. (2025). MySQL 8.4 Reference Manual: Overview of the MySQL Database Management System. Retrieved from https://dev.mysql.com/doc/refman/8.4/en/what-is.html",
    "Vue.js. (2025). Introduction. Retrieved from https://vuejs.org/guide/introduction",
    "World Wide Web Consortium (W3C). (2024). Accessibility, usability, and inclusion. Retrieved from https://www.w3.org/WAI/fundamentals/accessibility-usability-inclusion/",
]
for entry in reversed(refs):
    new_p = deepcopy(doc.paragraphs[666]._element)
    for child in list(new_p):
        if child.tag == qn("w:r"):
            new_p.remove(child)
    r = OxmlElement("w:r")
    t = OxmlElement("w:t")
    t.text = entry
    r.append(t)
    new_p.append(r)
    insert_before._element.addprevious(new_p)

# Thai research cited in Chapter 2.
thai_heading = next(p for p in doc.paragraphs if p.text.strip() == "ภาษาไทย")
thai_insert_before = next(p for p in doc.paragraphs if p.text.strip() == "References")
thai_ref = (
    "รุ่งเรือง มุศิริ, เกริกชัย ดีคำ, ประดิษฐ์ อายุวงษ์, ปวีณา ปรีชญากุล และบุญยฤทธิ์ ศรีปาน. "
    "(2568). ระบบการจองห้องประชุมออนไลน์ กรณีศึกษา: สำนักงานปลัดกระทรวงกลาโหม (ศรีสมาน). "
    "วารสารวิชาการ การจัดการเทคโนโลยี มหาวิทยาลัยราชภัฏมหาสารคาม, 12(1), 25–38. "
    "เข้าถึงได้จาก https://ph02.tci-thaijo.org/index.php/itm-journal/article/view/256614"
)
new_p = deepcopy(doc.paragraphs[654]._element)
for child in list(new_p):
    if child.tag == qn("w:r"):
        new_p.remove(child)
r = OxmlElement("w:r")
t = OxmlElement("w:t")
t.text = thai_ref
r.append(t)
new_p.append(r)
thai_insert_before._element.addprevious(new_p)

# Ask Word/LibreOffice to refresh fields, including page-number fields and TOC.
settings = doc.settings._element
update = settings.find(qn("w:updateFields"))
if update is None:
    update = OxmlElement("w:updateFields")
    settings.append(update)
update.set(qn("w:val"), "true")

doc.save(OUT)
print(OUT)

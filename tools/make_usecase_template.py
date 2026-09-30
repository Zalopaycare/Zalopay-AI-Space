"""Builds app/public/templates/Mau-chia-se-use-case.docx — the Word template people can fill in
and upload on "Chia sẻ use case" instead of typing into the form. Plain zipfile + WordprocessingML,
no extra dependencies. Headings here must match FIELDS in app/src/lib/docxImport.js.
Run: python3 tools/make_usecase_template.py"""
import zipfile, os
from xml.sax.saxutils import escape

CATS = ['Productivity & Personal Work', 'Content & Communication', 'Research & Knowledge', 'Data & Analysis', 'Coding & Technical', 'Automation & Workflow', 'Meeting & Collaboration', 'Design & Creative', 'Other']
TOPICS = ['Prompting', 'Tài liệu dài', 'Tóm tắt', 'Bảo mật dữ liệu', 'Tiếng Việt', 'Ticket & CSKH', 'Code review', 'Báo cáo']
TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Cursor', 'Codex', 'Perplexity', 'NotebookLM', 'n8n']

# (heading, required, guide, example answer line)
FIELDS = [
    ('Thông tin chung', None, None, None),
    ('Tên use case', True, 'Một câu ngắn nói rõ use case làm được gì.', 'Ví dụ: Tóm tắt phản hồi khách hàng theo tuần'),
    ('Dành cho ai', True, 'Vai trò hoặc nhóm nào dùng được use case này.', 'Ví dụ: QC / QE, team mobile'),
    ('Team / Nhóm', True, 'Nhóm đang làm use case, để người đọc biết hỏi ai.', 'Ví dụ: Product Ops'),
    ('Người thực hiện', True, 'Chọn 1: By tech  hoặc  By non-tech', ''),
    ('Trạng thái', True, 'Chọn 1: Ý tưởng  /  Prototype  /  Đang dùng thật', ''),
    ('Độ khó', True, 'Chọn 1: Dễ  /  Trung bình  /  Khó', ''),
    ('Category', True, 'Chọn 1 hoặc nhiều, cách nhau bằng dấu phẩy: ' + ', '.join(CATS), ''),
    ('Topic', False, 'Tối đa 3, cách nhau bằng dấu phẩy. Gợi ý: ' + ', '.join(TOPICS) + ' (hoặc ghi topic khác).', ''),
    ('Công cụ AI', False, 'Cách nhau bằng dấu phẩy. Gợi ý: ' + ', '.join(TOOLS) + ' (hoặc ghi công cụ khác).', ''),
    ('Nội dung', None, None, None),
    ('Vấn đề / Bối cảnh', True, 'Vấn đề bạn gặp và bối cảnh công việc. Ai gặp? Việc gì tốn công? Tốn bao nhiêu?', ''),
    ('Giải pháp / Cách làm', True, 'Các bước làm, viết sao cho người khác đọc là làm lại được. Mỗi bước một dòng.', ''),
    ('Cần chuẩn bị gì', True, 'Công cụ, quyền truy cập, dữ liệu hoặc tài khoản cần có trước khi bắt đầu. Mỗi mục một dòng.', ''),
    ('Prompt / Quy trình', True, 'Dán nguyên prompt hoặc mô tả workflow để người khác làm lại được. Chỗ cần sửa để trong [ngoặc vuông].', ''),
    ('Kết quả / Tác động', True, 'Kết quả đạt được: thời gian tiết kiệm, chất lượng, số liệu nếu có (ghi rõ đo trên bao nhiêu mẫu).', ''),
    ('Giới hạn & lưu ý', False, 'Chỗ nào AI còn sai, dữ liệu nào không được đưa vào, cần người kiểm lại khâu nào.', ''),
    ('Link tài liệu / repo', False, 'Link tới tài liệu, repo hoặc file mẫu.', ''),
    ('Người liên hệ (PIC)', False, 'Ai trả lời khi người đọc gặp vướng.', 'Ví dụ: Thảo NT · Product Ops'),
]

def run(text, bold=False, italic=False, color=None, size=None):
    rpr = ''.join([
        '<w:b/>' if bold else '', '<w:i/>' if italic else '',
        f'<w:color w:val="{color}"/>' if color else '', f'<w:sz w:val="{size}"/>' if size else '',
    ])
    return f'<w:r>{f"<w:rPr>{rpr}</w:rPr>" if rpr else ""}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'

def para(runs, style=None, space_after=None):
    ppr = ''
    if style or space_after is not None:
        ppr = '<w:pPr>' + (f'<w:pStyle w:val="{style}"/>' if style else '') + (f'<w:spacing w:after="{space_after}"/>' if space_after is not None else '') + '</w:pPr>'
    return f'<w:p>{ppr}{runs}</w:p>'

body = []
body.append(para(run('Mẫu chia sẻ use case — Zalopay AI Space'), 'Title'))
body.append(para(run('Cách dùng: ', bold=True) + run('điền nội dung ngay dưới mỗi mục. Giữ nguyên tên các mục in đậm (có thể xoá các dòng "Hướng dẫn"). Mục có dấu * là bắt buộc. Lưu file .docx rồi vào Zalopay AI Space → Chia sẻ use case → "Tải lên file Word đã điền": nội dung sẽ tự điền vào form để bạn kiểm tra và gửi duyệt.')))
for heading, required, guide, example in FIELDS:
    if required is None:
        body.append(para(run(heading), 'Heading1'))
        continue
    body.append(para(run(heading + (' *' if required else '')), 'Heading2'))
    body.append(para(run('Hướng dẫn: ' + guide, italic=True, color='7A8699', size=20), 'Guide'))
    body.append(para(run(example, color='A0A8B8') if example else '', None, 240))

document = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + ''.join(body) +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    '</w:body></w:document>')

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="22"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault>
  <w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:b/><w:color w:val="1A3FCC"/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="40"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="2C5FFF"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:customStyle="1" w:styleId="Guide"><w:name w:val="Guide"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="7A8699"/><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>'''

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''
rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

out = os.path.join(os.path.dirname(__file__), '..', 'app', 'public', 'templates', 'Mau-chia-se-use-case-Zalopay-AI-Space.docx')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels)
    z.writestr('word/document.xml', document)
    z.writestr('word/_rels/document.xml.rels', doc_rels)
    z.writestr('word/styles.xml', styles)
print('wrote', os.path.abspath(out))

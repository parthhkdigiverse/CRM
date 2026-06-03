"""
PDF generation service using ReportLab.
"""

import io
from datetime import datetime
from typing import Optional, Dict
from reportlab.lib.pagesizes import letter  # type: ignore
from reportlab.lib import colors  # type: ignore
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER  # type: ignore
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether  # type: ignore

def format_address(addr_dict: Optional[Dict]) -> str:
    """Format address dictionary into a multiline string."""
    if not addr_dict:
        return ""
    parts = []
    if addr_dict.get("street"):
        parts.append(addr_dict["street"])
    city_state = []
    if addr_dict.get("city"):
        city_state.append(addr_dict["city"])
    if addr_dict.get("state"):
        city_state.append(addr_dict["state"])
    if city_state:
        parts.append(", ".join(city_state))
    country_zip = []
    if addr_dict.get("country"):
        country_zip.append(addr_dict["country"])
    if addr_dict.get("zip"):
        country_zip.append(addr_dict["zip"])
    if country_zip:
        parts.append(" ".join(country_zip))
    return "\n".join(parts)

def generate_invoice_pdf(invoice, organization, company=None, contact=None) -> bytes:
    """Generate invoice PDF bytes using ReportLab."""
    buffer = io.BytesIO()
    
    # Page setup
    # Margins: 0.5 inches (36 pt)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    # Primary theme colors
    primary_color = colors.HexColor('#6366F1')  # indigo-500
    primary_dark = colors.HexColor('#4F46E5')   # indigo-600
    text_dark = colors.HexColor('#1F2937')      # gray-900
    text_muted = colors.HexColor('#4B5563')     # gray-600
    border_color = colors.HexColor('#E5E7EB')   # gray-200
    bg_light = colors.HexColor('#F9FAFB')       # gray-50
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_dark,
        alignment=TA_RIGHT
    )
    
    normal_bold = ParagraphStyle(
        'NormalBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=text_dark
    )
    
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_muted
    )
    
    normal_text_right = ParagraphStyle(
        'NormalTextRight',
        parent=normal_text,
        alignment=TA_RIGHT
    )
    
    normal_bold_right = ParagraphStyle(
        'NormalBoldRight',
        parent=normal_bold,
        alignment=TA_RIGHT
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=primary_dark
    )
    
    # Table styles
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )
    
    table_header_style_right = ParagraphStyle(
        'TableHeaderRight',
        parent=table_header_style,
        alignment=TA_RIGHT
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_dark
    )
    
    table_cell_style_right = ParagraphStyle(
        'TableCellRight',
        parent=table_cell_style,
        alignment=TA_RIGHT
    )

    story: list = []
    
    # --- HEADER BLOCK (Org Info on Left, Invoice Info on Right) ---
    org_name = organization.name if organization else "AI-Setu CRM"
    org_website = organization.website if (organization and organization.website) else ""
    org_address_str = format_address(organization.address) if organization else ""
    org_tax_id = f"Tax ID: {organization.tax_id}" if (organization and organization.tax_id) else ""
    
    org_info_parts = [f"<b>{org_name}</b>"]
    if org_address_str:
        org_info_parts.append(org_address_str.replace('\n', '<br/>'))
    if org_website:
        org_info_parts.append(org_website)
    if org_tax_id:
        org_info_parts.append(org_tax_id)
        
    org_info_html = "<br/>".join(org_info_parts)
    
    # Invoice metadata
    inv_num = invoice.invoice_number
    issue_date = invoice.created_at.strftime("%Y-%m-%d") if isinstance(invoice.created_at, datetime) else str(invoice.created_at)[:10]
    due_date = invoice.due_date.strftime("%Y-%m-%d") if isinstance(invoice.due_date, datetime) else (str(invoice.due_date)[:10] if invoice.due_date else "N/A")
    status_str = invoice.status.upper()
    
    # Status styling
    status_color = "#9CA3AF" # gray-400 for draft
    if invoice.status == "paid":
        status_color = "#10B981" # emerald-500
    elif invoice.status in ["pending", "sent"]:
        status_color = "#F59E0B" # amber-500
    elif invoice.status == "overdue":
        status_color = "#EF4444" # red-500
    
    status_html = f'<font color="{status_color}"><b>{status_str}</b></font>'
    
    meta_info_html = f"""
    <b>Invoice #:</b> {inv_num}<br/>
    <b>Date:</b> {issue_date}<br/>
    <b>Due Date:</b> {due_date}<br/>
    <b>Status:</b> {status_html}
    """
    
    header_data = [
        [
            Paragraph(org_info_html, normal_text),
            Paragraph(f"INVOICE<br/><br/>{meta_info_html}", normal_text_right)
        ]
    ]
    
    # Widths sum up to printable width: letter size width is 612 pt. Margins are 36 pt on each side, so printable width is 540 pt.
    header_table = Table(header_data, colWidths=[300, 240])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    story.append(header_table)
    story.append(Spacer(1, 15))
    
    # --- Accent line ---
    divider = Table([[""]], colWidths=[540])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 2, primary_color),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 15))
    
    # --- BILL TO BLOCK ---
    client_name = invoice.customer_name or ""
    client_email = ""
    client_phone = ""
    client_address_str = ""
    
    if company:
        client_name = company.name
        client_email = company.email or ""
        client_phone = company.phone or ""
        client_address_str = format_address(company.address)
    elif contact:
        client_name = contact.full_name
        client_email = contact.email or ""
        client_phone = contact.phone or ""
        
    # Fallback to customer_name if company/contact is not linked
    if not client_name and invoice.customer_name:
        client_name = invoice.customer_name
        
    bill_to_parts = [f"<b>{client_name}</b>"]
    if client_address_str:
        bill_to_parts.append(client_address_str.replace('\n', '<br/>'))
    if client_email:
        bill_to_parts.append(client_email)
    if client_phone:
        bill_to_parts.append(client_phone)
        
    bill_to_html = "<br/>".join(bill_to_parts)
    
    bill_to_data = [
        [
            Paragraph("<b>BILL TO:</b>", section_heading),
            ""
        ],
        [
            Paragraph(bill_to_html, normal_text),
            ""
        ]
    ]
    
    bill_to_table = Table(bill_to_data, colWidths=[300, 240])
    bill_to_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    story.append(bill_to_table)
    story.append(Spacer(1, 20))
    
    # --- ITEMS TABLE ---
    # Header: Description, Qty, Unit Price (INR), Tax %, Amount (INR)
    table_data = [
        [
            Paragraph("Description", table_header_style),
            Paragraph("Qty", table_header_style_right),
            Paragraph("Unit Price", table_header_style_right),
            Paragraph("Tax %", table_header_style_right),
            Paragraph("Amount", table_header_style_right)
        ]
    ]
    
    # Populate items
    currency_code = invoice.currency or "INR"
    for item in invoice.line_items:
        # Calculate amount
        qty = item.quantity
        price = item.unit_price
        tax = item.tax_percent
        amount = item.amount
        
        table_data.append([
            Paragraph(item.description, table_cell_style),
            Paragraph(f"{qty:,.2f}" if qty % 1 != 0 else f"{int(qty)}", table_cell_style_right),
            Paragraph(f"{price:,.2f}", table_cell_style_right),
            Paragraph(f"{tax}%" if tax > 0 else "0%", table_cell_style_right),
            Paragraph(f"{amount:,.2f}", table_cell_style_right)
        ])
        
    items_table = Table(table_data, colWidths=[240, 50, 90, 60, 100])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))
    
    # --- SUMMARY BLOCK (SUBTOTAL, TAX, DISCOUNT, TOTAL) ---
    subtotal_val = invoice.subtotal
    tax_val = invoice.tax_amount
    discount_val = invoice.discount
    total_val = invoice.total
    
    summary_rows = [
        ["Subtotal:", f"{currency_code} {subtotal_val:,.2f}"],
    ]
    if tax_val > 0:
        summary_rows.append(["Tax Amount:", f"{currency_code} {tax_val:,.2f}"])
    if discount_val > 0:
        summary_rows.append(["Discount:", f"- {currency_code} {discount_val:,.2f}"])
    summary_rows.append(["Total:", f"{currency_code} {total_val:,.2f}"])
    
    summary_table_data = []
    for label, val in summary_rows:
        is_total = label == "Total:"
        lbl_style = normal_bold_right if is_total else normal_text_right
        val_style = normal_bold_right if is_total else normal_text_right
        
        # Style Total row differently
        summary_table_data.append([
            Paragraph(f"<b>{label}</b>" if is_total else label, lbl_style),
            Paragraph(f"<b>{val}</b>" if is_total else val, val_style)
        ])
        
    summary_table = Table(summary_table_data, colWidths=[120, 120])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('LINEABOVE', (0, -1), (-1, -1), 1, primary_color), # border above total
    ]))
    
    # Align summary table to the right
    wrapper_data = [["", summary_table]]
    wrapper_table = Table(wrapper_data, colWidths=[300, 240])
    wrapper_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    story.append(wrapper_table)
    story.append(Spacer(1, 20))
    
    # --- NOTES & TERMS SECTION (KeepTogether to avoid orphan section) ---
    notes_parts: list = []
    
    if invoice.notes:
        notes_parts.append(Paragraph("<b>Notes:</b>", section_heading))
        notes_parts.append(Paragraph(invoice.notes.replace('\n', '<br/>'), normal_text))
        notes_parts.append(Spacer(1, 10))
        
    if invoice.payment_terms:
        # Map some common keys to human readable labels or print them
        terms_label = "Payment Terms / Methods"
        notes_parts.append(Paragraph(f"<b>{terms_label}:</b>", section_heading))
        notes_parts.append(Paragraph(invoice.payment_terms.replace('\n', '<br/>'), normal_text))
        notes_parts.append(Spacer(1, 10))
        
    # Default footer text
    notes_parts.append(Spacer(1, 10))
    notes_parts.append(Paragraph("<font color='#9CA3AF'>Thank you for your business!</font>", ParagraphStyle('ThankYou', parent=normal_text, alignment=TA_CENTER)))
    
    story.append(KeepTogether(notes_parts))
    
    # Build Document
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#9CA3AF'))
        # Draw page number centered
        canvas.drawCentredString(letter[0]/2.0, 20, f"Page {doc.page} • Generated by AI-Setu CRM")
        canvas.restoreState()
        
    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

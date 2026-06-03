"""
PDF generation service using ReportLab.
"""

import io
import os
from datetime import datetime
from typing import Optional, Dict
from reportlab.lib.pagesizes import letter  # type: ignore
from reportlab.lib import colors  # type: ignore
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER  # type: ignore
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image  # type: ignore

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
    text_dark = colors.HexColor('#1E293B')      # slate-800
    text_muted = colors.HexColor('#64748B')     # slate-500
    border_color = colors.HexColor('#E2E8F0')   # slate-200
    bg_light = colors.HexColor('#F8FAFC')       # slate-50
    bg_total = colors.HexColor('#EEF2FF')       # indigo-50
    border_total = colors.HexColor('#C7D2FE')   # indigo-200
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=32,
        textColor=primary_dark,
        alignment=TA_RIGHT
    )
    
    org_name_style = ParagraphStyle(
        'OrgName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=text_dark
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
    
    section_heading_small = ParagraphStyle(
        'SectionHeadingSmall',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=text_muted
    )
    
    # Table styles
    table_header_style_left = ParagraphStyle(
        'TableHeaderLeft',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white,
        alignment=TA_LEFT
    )
    
    table_header_style_right = ParagraphStyle(
        'TableHeaderRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white,
        alignment=TA_RIGHT
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_dark,
        alignment=TA_LEFT
    )
    
    table_cell_style_right = ParagraphStyle(
        'TableCellRight',
        parent=table_cell_style,
        alignment=TA_RIGHT
    )

    story: list = []
    
    # --- LOGO & BRANDING BLOCK ---
    org_name = organization.name if organization else "AI-Setu CRM"
    org_website = organization.website if (organization and organization.website) else ""
    org_address_str = format_address(organization.address) if organization else ""
    org_tax_id = f"Tax ID: {organization.tax_id}" if (organization and organization.tax_id) else ""
    
    # Safe Logo Image Loading
    logo_flowable = None
    if organization and organization.logo_url:
        try:
            logo_url = organization.logo_url
            if logo_url.startswith("http://") or logo_url.startswith("https://"):
                import httpx
                r = httpx.get(logo_url, timeout=2.0)
                if r.status_code == 200:
                    img_data = io.BytesIO(r.content)
                    logo_flowable = Image(img_data, height=35, width=105)
            elif os.path.exists(logo_url):
                logo_flowable = Image(logo_url, height=35, width=105)
        except Exception:
            # Fall back to text branding silently if image fetch fails
            pass
            
    # Build org details column flowables
    org_info_flowables: list = []
    if logo_flowable:
        org_info_flowables.append(logo_flowable)
        org_info_flowables.append(Spacer(1, 6))
    else:
        org_info_flowables.append(Paragraph(org_name, org_name_style))
        org_info_flowables.append(Spacer(1, 4))
        
    if org_website:
        org_info_flowables.append(Paragraph(org_website, normal_text))
        org_info_flowables.append(Spacer(1, 2))
    if org_address_str:
        org_info_flowables.append(Paragraph(org_address_str.replace('\n', '<br/>'), normal_text))
        org_info_flowables.append(Spacer(1, 2))
    if org_tax_id:
        org_info_flowables.append(Paragraph(org_tax_id, normal_text))
        
    header_data = [
        [
            org_info_flowables,
            Paragraph("INVOICE", title_style)
        ]
    ]
    
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
    
    # --- Accent Divider Line ---
    divider = Table([[""]], colWidths=[540])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, primary_color),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 15))
    
    # --- CLIENT & METADATA SECTION (Two Columns) ---
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
    
    # Invoice metadata
    inv_num = invoice.invoice_number
    issue_date = invoice.created_at.strftime("%Y-%m-%d") if isinstance(invoice.created_at, datetime) else str(invoice.created_at)[:10]
    due_date = invoice.due_date.strftime("%Y-%m-%d") if isinstance(invoice.due_date, datetime) else (str(invoice.due_date)[:10] if invoice.due_date else "N/A")
    status_str = invoice.status.upper()
    
    # Professional Status Badging
    badge_bg = "#F3F4F6"
    badge_fg = "#4B5563"
    if invoice.status == "paid":
        badge_bg = "#D1FAE5"  # emerald-100
        badge_fg = "#065F46"  # emerald-800
    elif invoice.status in ["pending", "sent"]:
        badge_bg = "#FEF3C7"  # amber-100
        badge_fg = "#92400E"  # amber-800
    elif invoice.status == "overdue":
        badge_bg = "#FEE2E2"  # red-100
        badge_fg = "#991B1B"  # red-800
        
    status_badge_style = ParagraphStyle(
        'StatusBadge',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor(badge_fg),
        alignment=TA_CENTER
    )
    
    status_badge = Table([[Paragraph(status_str, status_badge_style)]], colWidths=[65])
    status_badge.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(badge_bg)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    # Meta details table structure
    meta_details_data = [
        [Paragraph("Invoice Number:", normal_bold), Paragraph(inv_num, normal_text)],
        [Paragraph("Issue Date:", normal_bold), Paragraph(issue_date, normal_text)],
        [Paragraph("Due Date:", normal_bold), Paragraph(due_date, normal_text)],
        [Paragraph("Status:", normal_bold), status_badge]
    ]
    meta_details_table = Table(meta_details_data, colWidths=[90, 150])
    meta_details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    details_data = [
        [
            Paragraph("<b>BILL TO</b>", section_heading_small),
            Paragraph("<b>INVOICE DETAILS</b>", section_heading_small)
        ],
        [
            Paragraph(bill_to_html, normal_text),
            meta_details_table
        ]
    ]
    
    details_table = Table(details_data, colWidths=[270, 270])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    story.append(details_table)
    story.append(Spacer(1, 20))
    
    # --- ITEMS TABLE ---
    table_data = [
        [
            Paragraph("Description", table_header_style_left),
            Paragraph("Qty", table_header_style_right),
            Paragraph("Unit Price", table_header_style_right),
            Paragraph("Tax %", table_header_style_right),
            Paragraph("Amount", table_header_style_right)
        ]
    ]
    
    currency_code = invoice.currency or "INR"
    for item in invoice.line_items:
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
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')), # Professional Slate-800 Header
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg_light]),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, primary_color), # Elegant Indigo Accent Bar under Header
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, border_color), # Thin slate horizontal row lines
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
    total_label_style = ParagraphStyle(
        'TotalLabel',
        parent=normal_bold_right,
        fontSize=10,
        leading=14,
        textColor=primary_dark
    )
    total_val_style = ParagraphStyle(
        'TotalVal',
        parent=normal_bold_right,
        fontSize=10,
        leading=14,
        textColor=primary_dark
    )
    
    for label, val in summary_rows:
        is_total = label == "Total:"
        lbl_style = total_label_style if is_total else normal_text_right
        val_style = total_val_style if is_total else normal_text_right
        
        summary_table_data.append([
            Paragraph(f"<b>{label}</b>" if is_total else label, lbl_style),
            Paragraph(f"<b>{val}</b>" if is_total else val, val_style)
        ])
        
    summary_table = Table(summary_table_data, colWidths=[120, 120])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -2), 5),
        ('TOPPADDING', (0, 0), (-1, -2), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, bg_light), # very faint lines
        ('BACKGROUND', (0, -1), (-1, -1), bg_total), # Highlight block for Total row
        ('BOX', (0, -1), (-1, -1), 1, border_total), # Border around Total
        ('TOPPADDING', (0, -1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
    ]))
    
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
    
    # --- NOTES & TERMS CALLOUT CARD ---
    notes_content: list = []
    
    if invoice.notes:
        notes_content.append(Paragraph("<b>Notes</b>", section_heading_small))
        notes_content.append(Spacer(1, 4))
        notes_content.append(Paragraph(invoice.notes.replace('\n', '<br/>'), normal_text))
        
    if invoice.payment_terms:
        if notes_content:
            notes_content.append(Spacer(1, 10))
        notes_content.append(Paragraph("<b>Payment Terms & Instructions</b>", section_heading_small))
        notes_content.append(Spacer(1, 4))
        notes_content.append(Paragraph(invoice.payment_terms.replace('\n', '<br/>'), normal_text))
        
    if notes_content:
        notes_table = Table([[notes_content]], colWidths=[540])
        notes_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_light),
            ('BOX', (0, 0), (-1, -1), 1, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(KeepTogether(notes_table))
    
    # Build Document
    def add_footer(canvas, doc):
        canvas.saveState()
        # Clean bottom footer line
        canvas.setStrokeColor(colors.HexColor('#E2E8F0'))
        canvas.setLineWidth(0.5)
        canvas.line(36, 35, letter[0] - 36, 35)
        
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#9CA3AF'))
        canvas.drawCentredString(letter[0]/2.0, 20, f"Page {doc.page} • Generated by {org_name}")
        canvas.restoreState()
        
    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

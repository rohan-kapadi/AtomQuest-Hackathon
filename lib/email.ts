import { Resend } from 'resend'

// Initialize Resend. Will silently fail or throw if RESEND_API_KEY is not set,
// so we wrap calls in try/catch and log locally for hackathon purposes.
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

const MOCK_SENDER = 'AtomQuest <onboarding@resend.dev>'

export async function sendSubmissionEmail(employeeName: string, managerEmail: string, sheetId: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[EMAIL MOCK] To: ${managerEmail} | Subject: Goal Sheet Submitted`)
      return
    }

    await resend.emails.send({
      from: MOCK_SENDER,
      to: managerEmail,
      subject: `Action Required: ${employeeName} has submitted their goal sheet`,
      html: `
        <h2>Goal Sheet Submitted</h2>
        <p><strong>${employeeName}</strong> has submitted their goal sheet for your review and approval.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/manager/approvals/${sheetId}">Click here to review and approve</a></p>
      `,
    })
  } catch (error) {
    console.error('Failed to send submission email:', error)
  }
}

export async function sendApprovalEmail(employeeName: string, employeeEmail: string, sheetId: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[EMAIL MOCK] To: ${employeeEmail} | Subject: Goal Sheet Approved`)
      return
    }

    await resend.emails.send({
      from: MOCK_SENDER,
      to: employeeEmail,
      subject: `Approved: Your Goal Sheet has been approved`,
      html: `
        <h2>Goal Sheet Approved</h2>
        <p>Hi ${employeeName},</p>
        <p>Your manager has approved your goal sheet. Your goals are now locked for the cycle.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/employee/goals/${sheetId}">Click here to view your locked goals</a></p>
      `,
    })
  } catch (error) {
    console.error('Failed to send approval email:', error)
  }
}

export async function sendReturnEmail(employeeName: string, employeeEmail: string, sheetId: string, comment: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[EMAIL MOCK] To: ${employeeEmail} | Subject: Goal Sheet Returned`)
      return
    }

    await resend.emails.send({
      from: MOCK_SENDER,
      to: employeeEmail,
      subject: `Revision Required: Your Goal Sheet has been returned`,
      html: `
        <h2>Goal Sheet Returned</h2>
        <p>Hi ${employeeName},</p>
        <p>Your manager has returned your goal sheet for revision with the following comment:</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 1rem; color: #555;">
          ${comment}
        </blockquote>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/employee/goals/${sheetId}/edit">Click here to edit and resubmit your goals</a></p>
      `,
    })
  } catch (error) {
    console.error('Failed to send return email:', error)
  }
}

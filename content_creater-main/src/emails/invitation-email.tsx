import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

interface InvitationEmailProps {
  workspaceName: string
  role: string
  invitationUrl: string
  expiresAt?: string | null
  inviterName?: string
}

export default function InvitationEmail({
  workspaceName,
  role,
  invitationUrl,
  expiresAt,
  inviterName,
}: InvitationEmailProps) {
  const previewText = `You've been invited to join ${workspaceName}`

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={box}>
            <Text style={heading}>Social Media OS</Text>
            <Hr style={hr} />
          </Section>

          {/* Main Content */}
          <Section style={box}>
            <Text style={paragraph}>
              {inviterName ? (
                <>
                  <strong>{inviterName}</strong> has invited you to join{' '}
                  <strong>{workspaceName}</strong>
                </>
              ) : (
                <>You've been invited to join <strong>{workspaceName}</strong></>
              )}
            </Text>

            <Text style={paragraph}>
              Your role will be: <strong style={{ textTransform: 'capitalize' }}>{role}</strong>
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={invitationUrl}>
                Accept Invitation
              </Button>
            </Section>

            {/* Or paste link */}
            <Text style={paragraph}>
              Or copy and paste this URL:
              <br />
              <Link href={invitationUrl} style={link}>
                {invitationUrl}
              </Link>
            </Text>

            {/* Expiration Info */}
            {expiresAt && (
              <Text style={{ ...paragraph, color: '#666', fontSize: '12px' }}>
                This invitation expires on {formatDate(expiresAt)}
              </Text>
            )}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={hr} />
            <Text style={footerText}>
              © {new Date().getFullYear()} Social Media OS. All rights reserved.
            </Text>
            <Text style={footerText}>
              If you didn't expect this invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const box = {
  padding: '0 48px',
}

const heading = {
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '16px 0 0 0',
  color: '#1f2937',
}

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const buttonContainer = {
  padding: '24px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 32px',
  maxWidth: '200px',
  margin: '0 auto',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const footer = {
  padding: '0 48px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
}

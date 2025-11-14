import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  userName: string
  workspaceName: string
  dashboardUrl: string
}

export default function WelcomeEmail({
  userName,
  workspaceName,
  dashboardUrl,
}: WelcomeEmailProps) {
  const previewText = `Welcome to ${workspaceName}!`

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
            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
              Welcome to <strong>{workspaceName}</strong>! You've been successfully added to the
              workspace and can now start collaborating with your team.
            </Text>

            <Text style={paragraph}>Here's what you can do:</Text>

            <ul style={list}>
              <li style={listItem}>Connect your social media accounts</li>
              <li style={listItem}>Create and schedule posts</li>
              <li style={listItem}>Collaborate with your team</li>
              <li style={listItem}>View analytics and insights</li>
            </ul>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>

            <Text style={paragraph}>
              If you have any questions, feel free to reach out to your workspace administrator.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={hr} />
            <Text style={footerText}>
              © {new Date().getFullYear()} Social Media OS. All rights reserved.
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

const list = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  paddingLeft: '24px',
}

const listItem = {
  margin: '8px 0',
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

const footer = {
  padding: '0 48px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
}

import * as React from "react";
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from "@react-email/components";

type Props = { regionName?: string; flagUrl?: string; registeredAt?: string };
export default function WishlistReceivedEmail({ regionName = "St Lucia", flagUrl = "https://www.solortide.com/email-assets/flags/lc.png", registeredAt = "12 Oct 2026, 10:30 GMT-4" }: Props) {
  return <Html lang="en"><Head /><Preview>You’re on the list for {regionName}.</Preview>
    <Body style={{ margin: 0, padding: "32px 16px", backgroundColor: "#f3f7f5", fontFamily: "Arial, Helvetica, sans-serif", color: "#143e43" }}>
      <Container style={{ maxWidth: "520px", backgroundColor: "#ffffff", border: "1px solid #dce8e2", borderRadius: "18px", overflow: "hidden" }}>
        <Section style={{ padding: "28px 32px", backgroundColor: "#143e43" }}><Text style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>Sol &amp; Tide Energy</Text></Section>
        <Section style={{ padding: "32px" }}>
          <Heading style={{ margin: "0 0 24px", fontSize: "28px", lineHeight: "36px" }}>You’re on the list!</Heading>
          <Img src={flagUrl} alt={regionName} width="64" height="44" style={{ objectFit: "contain", marginBottom: "12px" }} />
          <Text style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 700 }}>{regionName}</Text>
          <Text style={{ margin: "0 0 26px", fontSize: "13px", lineHeight: "20px", color: "#647579" }}>Registered: {registeredAt}</Text>
          <Text style={{ margin: 0, fontSize: "16px", lineHeight: "26px" }}>Thank you for your interest in Sol &amp; Tide. We’re working to bring our services to {regionName} and will email you as soon as we have news to share.</Text>
        </Section>
      </Container>
    </Body>
  </Html>;
}

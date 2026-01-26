'use client';

import React from 'react';
import { Container, Box, Typography, Paper, Divider } from '@mui/material';

export default function TermsPage() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 8 }}>
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Terms & Conditions
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last Updated: January 26, 2026
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            User Terms & Conditions
          </Typography>

          <Typography variant="body1" paragraph>
            Welcome to CustomiseYou, an India-first online marketplace for customizable products.
            By registering and using this platform, you agree to comply with these terms and conditions.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            1. Acceptance of Terms
          </Typography>
          <Typography variant="body1" paragraph>
            By creating an account on CustomiseYou, you acknowledge that you have read, understood,
            and agree to be bound by these Terms & Conditions. If you do not agree to these terms,
            please do not use our platform.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2. User Account
          </Typography>
          <Typography variant="body1" paragraph>
            You are responsible for maintaining the confidentiality of your account credentials.
            You agree to provide accurate, current, and complete information during registration
            and to update such information as necessary.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3. Platform Usage
          </Typography>
          <Typography variant="body1" paragraph>
            CustomiseYou provides a marketplace for customizable products. All orders are subject
            to seller acceptance and product availability. We reserve the right to refuse service
            to anyone for any reason at any time.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            4. Payment Terms
          </Typography>
          <Typography variant="body1" paragraph>
            All payments must be made in advance through our supported payment methods.
            Cash on Delivery (COD) is not currently supported on our platform. Prices are
            displayed in Indian Rupees (INR) and include applicable taxes.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            5. Delivery & Shipping
          </Typography>
          <Typography variant="body1" paragraph>
            Delivery charges are calculated based on product weight, dimensions, and delivery location.
            Sellers are responsible for accurate delivery pricing. Estimated delivery times are provided
            by sellers and may vary based on customization complexity and location.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            6. Returns & Refunds
          </Typography>
          <Typography variant="body1" paragraph>
            Customized products may have different return policies than standard products. Please review
            the seller's return policy before placing an order. Refunds are processed according to the
            seller's stated policy and may take 5-10 business days to reflect in your account.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            7. Privacy & Data Protection
          </Typography>
          <Typography variant="body1" paragraph>
            Your privacy is important to us. We collect and process your personal information in accordance
            with applicable data protection laws. By using CustomiseYou, you consent to our collection and
            use of your information as described in our Privacy Policy.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            8. Intellectual Property
          </Typography>
          <Typography variant="body1" paragraph>
            All content on CustomiseYou, including text, graphics, logos, and images, is the property of
            CustomiseYou or its content suppliers and is protected by copyright and intellectual property laws.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            9. Limitation of Liability
          </Typography>
          <Typography variant="body1" paragraph>
            CustomiseYou acts as a marketplace platform connecting buyers and sellers. We are not responsible
            for the quality, safety, or legality of products listed, the accuracy of listings, or the ability
            of sellers to complete transactions.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            10. Dispute Resolution
          </Typography>
          <Typography variant="body1" paragraph>
            In case of disputes between buyers and sellers, CustomiseYou may facilitate communication and
            take appropriate platform actions. However, we do not guarantee resolution of disputes and
            encourage users to resolve matters amicably.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            11. Governing Law & Jurisdiction
          </Typography>
          <Typography variant="body1" paragraph>
            These Terms & Conditions are governed by the laws of India. Any disputes arising from these
            terms shall be subject to the exclusive jurisdiction of the courts in Patna, Bihar, India.
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            12. Changes to Terms
          </Typography>
          <Typography variant="body1" paragraph>
            We reserve the right to modify these Terms & Conditions at any time. Changes will be effective
            immediately upon posting on the platform. Your continued use of CustomiseYou after changes
            constitutes acceptance of the modified terms.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            For questions about these Terms & Conditions, please contact us at support@customiseyou.com
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

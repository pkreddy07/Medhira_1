import React from 'react';
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  clinicBlock: {
    flex: 1,
  },
  clinicName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1a56db',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
  },
  qualification: {
    fontSize: 9,
    color: '#555',
    marginBottom: 2,
  },
  headerMeta: {
    fontSize: 9,
    color: '#444',
    lineHeight: 1.5,
  },
  dateBlock: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  dateLabel: {
    fontSize: 9,
    color: '#666',
  },
  dateValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  regNo: {
    fontSize: 9,
    color: '#666',
    marginTop: 4,
  },

  divider: {
    borderBottom: '1 solid #ccd3e0',
    marginVertical: 6,
  },

  // ── Patient info row ─────────────────────────────────
  patientRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f4ff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    gap: 16,
  },
  patientField: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 8,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  patientValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Sections ─────────────────────────────────────────
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    backgroundColor: '#1a56db',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    padding: '4 8',
    marginBottom: 4,
  },
  sectionBody: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    lineHeight: 1.6,
    color: '#222',
  },

  // Medication gets a slightly different treatment
  medicationBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fffbeb',
    borderLeft: '3 solid #f59e0b',
    fontSize: 10,
    lineHeight: 1.7,
    color: '#222',
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  signatureBlock: {
    alignItems: 'center',
    minWidth: 160,
  },
  signatureLine: {
    width: 160,
    borderBottom: '1 solid #333',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  signatureSub: {
    fontSize: 8,
    color: '#555',
  },
  footerNote: {
    fontSize: 7.5,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
    borderTop: '1 solid #ddd',
    paddingTop: 4,
  },
});

const Divider = () => <View style={styles.divider} />;

const Section = ({ title, children, medication = false }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{title}</Text>
    <Text style={medication ? styles.medicationBox : styles.sectionBody}>{children}</Text>
  </View>
);

const ClinicPrescriptionPDF = ({ summary, clinic }) => {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Clinic Header ── */}
        <View style={styles.header}>
          <View style={styles.clinicBlock}>
            <Text style={styles.clinicName}>{clinic.clinicName || 'Clinic Name'}</Text>
            <Text style={styles.doctorName}>Dr. {clinic.doctorName || 'Doctor Name'}</Text>
            {clinic.qualification ? (
              <Text style={styles.qualification}>{clinic.qualification}</Text>
            ) : null}
            {clinic.address ? (
              <Text style={styles.headerMeta}>{clinic.address}</Text>
            ) : null}
            {clinic.phone || clinic.email ? (
              <Text style={styles.headerMeta}>
                {[clinic.phone, clinic.email].filter(Boolean).join('  |  ')}
              </Text>
            ) : null}
          </View>

          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{today}</Text>
            {clinic.registrationNo ? (
              <Text style={styles.regNo}>Reg. No: {clinic.registrationNo}</Text>
            ) : null}
          </View>
        </View>

        <Divider />

        {/* ── Patient Info ── */}
        <View style={styles.patientRow}>
          <View style={styles.patientField}>
            <Text style={styles.patientLabel}>Patient Name</Text>
            <Text style={styles.patientValue}>{summary.patientName || '—'}</Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.patientLabel}>Age</Text>
            <Text style={styles.patientValue}>{summary.age || '—'}</Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.patientLabel}>Gender</Text>
            <Text style={styles.patientValue}>{summary.gender || '—'}</Text>
          </View>
        </View>

        {/* ── Sections ── */}
        <Section title="Chief Complaint & Symptoms">
          {summary.symptoms || 'Not specified'}
        </Section>

        <Section title="Medical History">
          {summary.history || 'Not specified'}
        </Section>

        <Section title="Examination Findings">
          {summary.examination || 'Not specified'}
        </Section>

        <Section title="Diagnosis">
          {summary.diagnosis || 'Not specified'}
        </Section>

        <Section title="Prescription / Medication" medication>
          {summary.medication || 'Not specified'}
        </Section>

        <Section title="Follow-Up Instructions">
          {summary.followUp || 'Not specified'}
        </Section>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Dr. {clinic.doctorName || 'Doctor'}</Text>
              {clinic.qualification ? (
                <Text style={styles.signatureSub}>{clinic.qualification}</Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.footerNote}>
            This document was generated by Medhira — confidential medical record
          </Text>
        </View>

      </Page>
    </Document>
  );
};

export default ClinicPrescriptionPDF;

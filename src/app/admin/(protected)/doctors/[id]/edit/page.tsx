import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { getDoctorByIdAdmin } from "@/services/doctor.service";
import { DoctorForm, type DoctorFormDefaults } from "../../doctor-form";
import { updateDoctorAction } from "../../actions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { asPopulatedMedia } from "@/types/media";

export const metadata: Metadata = { title: "Edit Doctor" };

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = isValidObjectId(id) ? await getDoctorByIdAdmin(id) : null;

  if (!doctor) {
    notFound();
  }

  // Serialised so the populated Media document can cross into the client form.
  const photo = asPopulatedMedia(doctor.photo) ? JSON.parse(JSON.stringify(doctor.photo)) : null;

  const defaultValues: DoctorFormDefaults = {
    name: doctor.name,
    designation: doctor.designation,
    qualifications: doctor.qualifications ?? undefined,
    experienceYears: doctor.experienceYears ?? undefined,
    bio: doctor.bio ?? undefined,
    photo,
    socialLinks: {
      facebook: doctor.socialLinks?.facebook ?? undefined,
      x: doctor.socialLinks?.x ?? undefined,
      whatsapp: doctor.socialLinks?.whatsapp ?? undefined,
    },
    status: doctor.status,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/doctors", label: "All doctors" }}
        title="Edit doctor"
        meta={<StatusBadge status={doctor.status} kind="doctor" />}
        description={doctor.name}
      />
      <DoctorForm action={updateDoctorAction.bind(null, id)} submitLabel="Save changes" defaultValues={defaultValues} />
    </div>
  );
}

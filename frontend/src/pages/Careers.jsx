import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Header from '../components/Header';
import { Briefcase, Calendar, MapPin, DollarSign, Send, CheckCircle } from 'lucide-react';

export default function Careers() {
  const [jobOpenings, setJobOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [applicantName, setApplicantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [customAnswers, setCustomAnswers] = useState({});

  useEffect(() => {
    api('/api/careers')
      .then((res) => res.json())
      .then((data) => {
        if (data.jobOpenings) setJobOpenings(data.jobOpenings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setSubmitted(false);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const res = await api('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobOpeningId: selectedJob.id,
          applicantName,
          email,
          phone,
          qualification,
          experience,
          coverLetter,
          applicationData: customAnswers,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      }
    } catch (err) {
      alert('Error submitting application');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header userRole="GUEST" />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        <div className="text-center space-y-3 bg-[#0b192c] text-white p-8 md:p-12 rounded-3xl border border-[#1e3e62] shadow-2xl">
          <div className="inline-flex items-center space-x-2 bg-[#0d9488] text-white px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider">
            <Briefcase className="w-4 h-4" />
            <span>Join Our Team</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Career Opportunities</h1>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto">
            Shape the leaders of tomorrow at St. Xavier International School. Explore current faculty, administrative, and operations openings.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium">Loading open positions...</div>
        ) : jobOpenings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <p className="font-bold text-lg text-[#0b192c]">No Openings Currently Available</p>
            <p className="text-xs">Please check back soon for updates to our faculty and operations roster.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-[#0b192c] flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-[#0d9488]" />
                <span>Available Job Openings ({jobOpenings.length})</span>
              </h2>

              <div className="space-y-4">
                {jobOpenings.map((job) => (
                  <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#0d9488] transition-all space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-[#0b192c]">{job.title}</h3>
                        <span className="text-xs font-bold text-[#0d9488] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md mt-1 inline-block">
                          {job.department}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 flex items-center space-x-1 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{job.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div><strong className="text-slate-700">Experience:</strong> {job.experience}</div>
                      <div><strong className="text-slate-700">Salary:</strong> {job.salaryRange || 'As per norms'}</div>
                    </div>

                    <button
                      onClick={() => handleApplyClick(job)}
                      className="bg-[#0b192c] hover:bg-[#1e3e62] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                    >
                      <span>Apply For This Role</span>
                      <Send className="w-3.5 h-3.5 text-teal-300" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Modal / Form */}
            <div className="lg:col-span-1">
              {selectedJob ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4 sticky top-6">
                  <h3 className="text-base font-bold text-[#0b192c]">Apply for {selectedJob.title}</h3>

                  {submitted ? (
                    <div className="bg-teal-50 border border-teal-200 text-teal-900 p-4 rounded-xl text-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-[#0d9488] mx-auto" />
                      <p className="font-bold text-sm">Application Submitted!</p>
                      <p className="text-xs text-teal-800">Thank you for applying. Our HR team will review your application.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitApplication} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={applicantName}
                          onChange={(e) => setApplicantName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Qualification</label>
                          <input
                            type="text"
                            value={qualification}
                            onChange={(e) => setQualification(e.target.value)}
                            placeholder="e.g. M.Sc, B.Ed"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Experience</label>
                          <input
                            type="text"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            placeholder="e.g. 3 Years"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Custom Form Fields if configured */}
                      {selectedJob.customFieldsJson && JSON.parse(selectedJob.customFieldsJson || '[]').map((field, idx) => (
                        <div key={idx}>
                          <label className="block text-xs font-bold text-slate-700 mb-1">{field.label}</label>
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [field.label]: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                          />
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Cover Note</label>
                        <textarea
                          rows={3}
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d9488] focus:outline-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                      >
                        Submit Application Now
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="bg-slate-100 p-6 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                  Click <strong>Apply For This Role</strong> on any opening to open the application form.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

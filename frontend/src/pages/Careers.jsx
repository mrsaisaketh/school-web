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
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
      <Header userRole="GUEST" />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">
        {/* Left-aligned and ruled, like the notice posted on the office board. */}
        <div className="border-b border-rule pb-8">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-faint">
            Work with us
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.015em] text-ink md:text-5xl">
            Current openings
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Teaching, administrative and operations roles at St. Xavier International School.
            Applications are read in the order they arrive.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink-soft font-medium">Loading openings…</div>
        ) : jobOpenings.length === 0 ? (
          <div className="text-center py-16 bg-sheet border border-rule text-ink-soft space-y-2">
            <p className="font-medium text-lg text-ink">No openings just now</p>
            <p className="text-xs">New roles are posted here as they open.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-[0.9375rem] font-semibold text-ink flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-copy" />
                <span>Open positions ({jobOpenings.length})</span>
              </h2>

              <div className="space-y-4">
                {jobOpenings.map((job) => (
                  <div key={job.id} className="bg-sheet p-6 border border-rule hover:border-copy transition-all space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-ink">{job.title}</h3>
                        <span className="text-xs font-medium text-copy bg-copy-wash border border-copy/25 px-2.5 py-1 mt-1 inline-block">
                          {job.department}
                        </span>
                      </div>
                      <span className="text-xs text-ink-soft flex items-center space-x-1 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <p className="text-xs text-ink-soft leading-relaxed">{job.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-paper p-3 border border-rule-soft">
                      <div><strong className="text-ink">Experience:</strong> {job.experience}</div>
                      <div><strong className="text-ink">Salary:</strong> {job.salaryRange || 'As per norms'}</div>
                    </div>

                    <button
                      onClick={() => handleApplyClick(job)}
                      className="bg-ink hover:bg-copy-deep text-white text-xs font-medium px-5 py-2.5 transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <span>Apply</span>
                      <Send className="w-3.5 h-3.5 text-copy" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Modal / Form */}
            <div className="lg:col-span-1">
              {selectedJob ? (
                <div className="bg-sheet p-6 border border-rule space-y-4 sticky top-6">
                  <h3 className="text-base font-medium text-ink">Apply for {selectedJob.title}</h3>

                  {submitted ? (
                    <div className="bg-copy-wash border border-copy/25 text-copy-deep p-4 text-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-copy mx-auto" />
                      <p className="font-medium text-sm">Application Submitted!</p>
                      <p className="text-xs text-copy-deep">Thank you for applying. Our HR team will review your application.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitApplication} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={applicantName}
                          onChange={(e) => setApplicantName(e.target.value)}
                          className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Email *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-ink mb-1">Qualification</label>
                          <input
                            type="text"
                            value={qualification}
                            onChange={(e) => setQualification(e.target.value)}
                            placeholder="e.g. M.Sc, B.Ed"
                            className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink mb-1">Experience</label>
                          <input
                            type="text"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            placeholder="e.g. 3 Years"
                            className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Custom Form Fields if configured */}
                      {selectedJob.customFieldsJson && JSON.parse(selectedJob.customFieldsJson || '[]').map((field, idx) => (
                        <div key={idx}>
                          <label className="block text-xs font-medium text-ink mb-1">{field.label}</label>
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [field.label]: e.target.value })}
                            className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                          />
                        </div>
                      ))}

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1">Cover Note</label>
                        <textarea
                          rows={3}
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          className="w-full px-3 py-2 border border-rule text-xs focus:ring-2 focus:ring-copy focus:outline-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-copy hover:bg-copy-deep text-white font-medium py-2.5 text-xs transition-all cursor-pointer"
                      >
                        Submit Application Now
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="bg-paper p-6 border border-dashed border-rule text-center text-ink-soft text-xs">
                  Click <strong>Apply</strong> on any opening to open the application form.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

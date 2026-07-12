'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import { courseService } from '@/services/courseService';
import { CourseDetail } from '@/types/course';

type PaymentMethod = 'stripe' | 'banking' | 'bkash' | 'nagad';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  {
    id: 'stripe',
    label: 'Stripe (Card)',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.889-4.276C17.828 2.048 15.65 1.5 13.476 1.5c-4.64 0-7.495 2.693-7.495 5.925 0 3.064 2.988 4.607 5.593 5.515 2.412.839 3.636 1.507 3.636 2.562 0 .95-.783 1.496-2.216 1.496-2.396 0-5.04-1.127-6.805-2.056l-.904 4.3c1.642.99 4.313 1.758 6.792 1.758 5.09 0 7.92-2.724 7.92-6.18 0-3.294-3.115-4.927-5.471-5.681z" />
      </svg>
    ),
  },
  {
    id: 'banking',
    label: 'Bank Transfer',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'bkash',
    label: 'bKash',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 48 48" fill="currentColor">
        <rect x="8" y="8" width="32" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">bKash</text>
      </svg>
    ),
  },
  {
    id: 'nagad',
    label: 'Nagad',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 48 48" fill="currentColor">
        <rect x="8" y="8" width="32" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">Nagad</text>
      </svg>
    ),
  },
];

const EnrollPage = () => {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.courseId) {
      loadCourse();
    }
  }, [params.courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const data = await courseService.getCourseDetail(params.courseId as string);
      setCourse(data);
    } catch {
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) return;
    setProcessing(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const result = await courseService.enroll(params.courseId as string, selectedMethod);
      setTransactionId(result.transaction_id);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (success) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <div className="animate-fadeIn max-w-lg mx-auto">
          <Card>
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
              <p className="text-purple-200/60 mb-6">You have been enrolled in {course?.title}</p>
              <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/50">Transaction ID</span>
                  <span className="text-white font-mono">{transactionId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/50">Amount</span>
                  <span className="text-white font-semibold">৳{course?.cost?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/50">Method</span>
                  <span className="text-white capitalize">{selectedMethod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/50">Status</span>
                  <span className="text-emerald-400 font-medium">Completed</span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push('/student/courses')}
              >
                Go to My Courses
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout allowedRoles={['student']}>
        <Card>
          <p className="text-red-400 text-center py-8">{error || 'Course not found'}</p>
          <div className="text-center">
            <Button variant="outline" onClick={() => router.push('/student/courses')}>Back to Courses</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['student']}>
      <div className="animate-fadeIn max-w-2xl mx-auto">
        <button
          onClick={() => router.push(`/student/courses/${params.courseId}`)}
          className="flex items-center gap-2 text-sm text-purple-200/50 hover:text-purple-200 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Course Details
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-white mb-4">Select Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      selectedMethod === method.id
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-lg shadow-purple-500/10'
                        : 'bg-white/5 border-white/10 text-purple-200/60 hover:bg-white/10 hover:text-purple-200'
                    }`}
                  >
                    {method.icon}
                    <span className="text-sm font-medium">{method.label}</span>
                    {selectedMethod === method.id && (
                      <svg className="w-5 h-5 ml-auto text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {selectedMethod && (
              <Card>
                <h3 className="text-sm font-semibold text-purple-200 mb-4">
                  {selectedMethod === 'stripe' && 'Card Details (Mock)'}
                  {selectedMethod === 'banking' && 'Bank Transfer Details (Mock)'}
                  {selectedMethod === 'bkash' && 'bKash Payment (Mock)'}
                  {selectedMethod === 'nagad' && 'Nagad Payment (Mock)'}
                </h3>

                {selectedMethod === 'stripe' && (
                  <div className="space-y-4">
                    <Input label="Card Number" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Expiry Date" placeholder="12/28" defaultValue="12/28" />
                      <Input label="CVV" placeholder="123" defaultValue="123" />
                    </div>
                    <Input label="Card Holder Name" placeholder="John Doe" defaultValue="John Doe" />
                  </div>
                )}

                {selectedMethod === 'banking' && (
                  <div className="space-y-4">
                    <Input label="Bank Name" placeholder="DBBL, SBI, etc." defaultValue="DBBL" />
                    <Input label="Account Number" placeholder="Enter account number" defaultValue="1234567890" />
                    <Input label="Account Holder Name" placeholder="John Doe" defaultValue="John Doe" />
                  </div>
                )}

                {selectedMethod === 'bkash' && (
                  <div className="space-y-4">
                    <Input label="bKash Number" placeholder="01XXXXXXXXX" defaultValue="01712345678" />
                    <Input label="PIN" type="password" placeholder="****" defaultValue="1234" />
                  </div>
                )}

                {selectedMethod === 'nagad' && (
                  <div className="space-y-4">
                    <Input label="Nagad Number" placeholder="01XXXXXXXXX" defaultValue="01712345678" />
                    <Input label="PIN" type="password" placeholder="****" defaultValue="1234" />
                  </div>
                )}

                <p className="text-xs text-purple-200/40 mt-3">
                  This is a mock payment gateway. No real payment will be processed.
                </p>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card>
              <h3 className="text-sm font-semibold text-purple-200 mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Course</span>
                  <span className="text-white font-medium text-right max-w-[60%]">{course.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Code</span>
                  <span className="text-white font-mono text-xs">{course.course_code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/60">Duration</span>
                  <span className="text-white">{course.duration}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
                  <span className="text-purple-200/80 font-medium">Total</span>
                  <span className="text-xl font-bold text-white">৳{course.cost?.toLocaleString() || '0'}</span>
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handlePayment}
                loading={processing}
                disabled={!selectedMethod}
              >
                {processing ? 'Processing Payment...' : `Pay ৳${course.cost?.toLocaleString() || '0'}`}
              </Button>
              {error && (
                <p className="text-xs text-red-400 text-center mt-3">{error}</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EnrollPage;


import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import TaskCard from '@/components/TaskCard';
import CreateTaskForm from '@/components/CreateTaskForm';
import TaskApplicationCard from '@/components/TaskApplicationCard';
import VerificationCodeCard from '@/components/VerificationCodeCard';
import RatingDialog from '@/components/RatingDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, ClipboardCheck, User, Clock, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskType, ApplicationType, JointTaskMemberType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extendedSupabase } from '@/integrations/supabase/extended-client';
import { useAuth } from '@/context/AuthContext';

// Function to generate a random 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const Task = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [appliedTasks, setAppliedTasks] = useState<TaskType[]>([]);
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [jointTaskRequests, setJointTaskRequests] = useState<JointTaskMemberType[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [currentTaskForRating, setCurrentTaskForRating] = useState<TaskType | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserTasks = async () => {
      try {
        setIsLoading(true);
        if (!user) return;

        // First we get tasks created by the user
        const { data: createdTasksData, error: createdTasksError } = await supabase
          .from('tasks')
          .select('*, requestor_verification_code, doer_verification_code, is_requestor_verified, is_doer_verified')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        if (createdTasksError) {
          console.error('Error fetching created tasks:', createdTasksError);
          throw createdTasksError;
        }

        // Then we get tasks the user has applied to
        const { data: applications, error: applicationsError } = await extendedSupabase
          .from('task_applications')
          .select('task_id, status')
          .eq('applicant_id', user.id);
          
        if (applicationsError) {
          console.error('Error fetching applications:', applicationsError);
          throw applicationsError;
        }
        
        const appliedTaskIds = applications?.map(app => app.task_id) || [];
        
        let appliedTasksData = [];
        if (appliedTaskIds.length > 0) {
          const { data, error } = await supabase
            .from('tasks')
            .select('*, requestor_verification_code, doer_verification_code, is_requestor_verified, is_doer_verified')
            .in('id', appliedTaskIds)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error('Error fetching applied tasks:', error);
            throw error;
          }
          appliedTasksData = data || [];
        }

        // Get applications for the user's created tasks
        const { data: taskApplications, error: taskApplicationsError } = await extendedSupabase
          .from('task_applications')
          .select('*')
          .in('task_id', createdTasksData?.map(task => task.id) || []);
          
        if (taskApplicationsError) {
          console.error('Error fetching task applications:', taskApplicationsError);
          throw taskApplicationsError;
        }
        
        // Fetch applicant names for each application
        const enhancedApplicationsPromises = (taskApplications || []).map(async (app) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', app.applicant_id)
            .single();
              
          const { data: taskData } = await supabase
            .from('tasks')
            .select('title')
            .eq('id', app.task_id)
            .single();
              
          return {
            id: app.id,
            taskId: app.task_id,
            userId: app.applicant_id,
            username: profileData?.username || 'Unknown user',
            message: app.message,
            rating: 0, // Default rating
            createdAt: new Date(app.created_at),
            status: app.status,
            applicantName: profileData?.username || 'Unknown user',
            taskTitle: taskData?.title || 'Unknown task'
          } as ApplicationType;
        });
        
        const enhancedApplications = await Promise.all(enhancedApplicationsPromises);
        setApplications(enhancedApplications);

        // Process tasks created by the user
        const processedCreatedTasks = await Promise.all(
          (createdTasksData || []).map(async (task) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', task.creator_id)
              .single();

            const status = task.status === 'active' || task.status === 'completed'
              ? task.status as 'active' | 'completed'
              : 'active';

            const taskType = task.task_type === 'joint' ? 'joint' : 'normal';

            return {
              id: task.id,
              title: task.title,
              description: task.description || '',
              location: task.location || '',
              reward: task.reward || 0,
              deadline: task.deadline ? new Date(task.deadline) : new Date(),
              taskType: taskType as 'normal' | 'joint',
              status: status,
              createdAt: new Date(task.created_at),
              creatorId: task.creator_id,
              creatorName: profileData?.username || 'Unknown user',
              creatorRating: task.creator_rating || 0,
              doerId: task.doer_id,
              requestorVerificationCode: task.requestor_verification_code,
              doerVerificationCode: task.doer_verification_code,
              isRequestorVerified: task.is_requestor_verified,
              isDoerVerified: task.is_doer_verified
            };
          })
        );

        // Process tasks the user has applied to
        const processedAppliedTasks = await Promise.all(
          (appliedTasksData || []).map(async (task) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', task.creator_id)
              .single();

            const status = task.status === 'active' || task.status === 'completed'
              ? task.status as 'active' | 'completed'
              : 'active';

            const taskType = task.task_type === 'joint' ? 'joint' : 'normal';
            
            // Find the application status for this task
            const application = applications?.find(app => app.task_id === task.id);
            const applicationStatus = application ? application.status : 'pending';

            return {
              id: task.id,
              title: task.title,
              description: task.description || '',
              location: task.location || '',
              reward: task.reward || 0,
              deadline: task.deadline ? new Date(task.deadline) : new Date(),
              taskType: taskType as 'normal' | 'joint',
              status: status,
              createdAt: new Date(task.created_at),
              creatorId: task.creator_id,
              creatorName: profileData?.username || 'Unknown user',
              creatorRating: task.creator_rating || 0,
              doerId: task.doer_id,
              applicationStatus: applicationStatus,
              requestorVerificationCode: task.requestor_verification_code,
              doerVerificationCode: task.doer_verification_code,
              isRequestorVerified: task.is_requestor_verified,
              isDoerVerified: task.is_doer_verified
            };
          })
        );

        setTasks(processedCreatedTasks);
        setAppliedTasks(processedAppliedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTasks();
    
    const channel = supabase
      .channel('public:task_applications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'task_applications' 
        }, 
        async (payload) => {
          if (user && payload.new) {
            await fetchUserTasks();
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleCreateTask = async (task: TaskType) => {
    if (tasks.filter(t => t.status === 'active').length >= 3) {
      toast({
        title: "Limit Reached",
        description: "You can only have 3 active tasks at a time.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          location: task.location,
          reward: task.reward,
          deadline: task.deadline.toISOString(),
          task_type: task.taskType,
          creator_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: TaskType = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        location: data.location || '',
        reward: data.reward,
        deadline: new Date(data.deadline),
        taskType: data.task_type === 'normal' ? 'normal' : 'joint',
        status: 'active',
        createdAt: new Date(data.created_at),
        creatorId: data.creator_id,
        creatorName: user?.email || 'Unknown user',
        creatorRating: 0,
      };
      
      setTasks([newTask, ...tasks]);
      setIsCreateDialogOpen(false);
      toast({
        title: "Task Created",
        description: "Your task has been created successfully."
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed' } 
          : task
      ));
      
      toast({
        title: "Task Cancelled",
        description: "Your task has been cancelled."
      });
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast({
        title: "Error",
        description: "Failed to cancel task. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleEditTask = async (updatedTask: TaskType) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          location: updatedTask.location,
          reward: updatedTask.reward,
          deadline: updatedTask.deadline.toISOString(),
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === updatedTask.id 
          ? updatedTask 
          : task
      ));
      
      toast({
        title: "Task Updated",
        description: "Your task has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleApplyForTask = async (taskId: string, message: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to apply for tasks.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data: existingApplications, error: checkError } = await extendedSupabase
        .from('task_applications')
        .select('*')
        .eq('task_id', taskId)
        .eq('applicant_id', user.id)
        .limit(1);
        
      if (checkError) throw checkError;
      
      if (existingApplications && existingApplications.length > 0) {
        toast({
          title: "Already Applied",
          description: "You have already applied for this task",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await extendedSupabase
        .from('task_applications')
        .insert({
          task_id: taskId,
          applicant_id: user.id,
          message: message
        });

      if (error) throw error;
      
      toast({
        title: "Application Submitted",
        description: "Your application has been sent to the task creator."
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleJoinJointTask = (taskId: string, needs: string, reward: number) => {
    toast({
      title: "Feature not implemented",
      description: "Joint task requests will be available soon.",
    });
  };

  const handleApproveApplication = async (applicationId: string, taskId: string, applicantId: string) => {
    try {
      // Generate verification codes
      const requestorCode = generateVerificationCode();
      const doerCode = generateVerificationCode();
      
      // Update the task with the doer and verification codes
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({
          doer_id: applicantId,
          requestor_verification_code: requestorCode,
          doer_verification_code: doerCode,
          is_requestor_verified: false,
          is_doer_verified: false
        })
        .eq('id', taskId);
        
      if (taskUpdateError) throw taskUpdateError;
      
      // Update the application status
      const { error: applicationUpdateError } = await extendedSupabase
        .from('task_applications')
        .update({
          status: 'approved'
        })
        .eq('id', applicationId);
        
      if (applicationUpdateError) throw applicationUpdateError;
      
      // Reject all other applications for this task
      const { error: rejectOthersError } = await extendedSupabase
        .from('task_applications')
        .update({
          status: 'rejected'
        })
        .eq('task_id', taskId)
        .neq('id', applicationId);
        
      if (rejectOthersError) throw rejectOthersError;
      
      // Update the applications state
      setApplications(applications.map(app => {
        if (app.id === applicationId) {
          return { ...app, status: 'approved' };
        } else if (app.taskId === taskId) {
          return { ...app, status: 'rejected' };
        }
        return app;
      }));
      
      // Update the tasks state
      setTasks(tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            doerId: applicantId,
            requestorVerificationCode: requestorCode,
            doerVerificationCode: doerCode,
            isRequestorVerified: false,
            isDoerVerified: false
          };
        }
        return task;
      }));
      
      toast({
        title: "Application Approved",
        description: "The applicant has been assigned to this task."
      });
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "Error",
        description: "Failed to approve application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      const { error } = await extendedSupabase
        .from('task_applications')
        .update({
          status: 'rejected'
        })
        .eq('id', applicationId);
        
      if (error) throw error;
      
      // Update the applications state
      setApplications(applications.map(app => 
        app.id === applicationId 
          ? { ...app, status: 'rejected' } 
          : app
      ));
      
      toast({
        title: "Application Rejected",
        description: "The application has been rejected."
      });
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "Error",
        description: "Failed to reject application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVerifyCode = async (taskId: string, code: string) => {
    try {
      // First, find the task
      const task = [...tasks, ...appliedTasks].find(t => t.id === taskId);
      
      if (!task) {
        throw new Error("Task not found");
      }
      
      const isDoer = task.doerId === user?.id;
      const expectedCode = isDoer ? task.doerVerificationCode : task.requestorVerificationCode;
      
      // Check if the code matches
      if (code !== expectedCode) {
        return false;
      }
      
      // Update the verification status
      const updateData = isDoer 
        ? { is_doer_verified: true }
        : { is_requestor_verified: true };
        
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);
        
      if (error) throw error;
      
      // Check if both parties are verified
      const { data: updatedTask, error: fetchError } = await supabase
        .from('tasks')
        .select('is_requestor_verified, is_doer_verified')
        .eq('id', taskId)
        .single();
        
      if (fetchError || !updatedTask) {
        throw new Error("Could not retrieve updated task verification status");
      }
        
      // Update the tasks state
      if (isDoer) {
        // Update in applied tasks
        setAppliedTasks(appliedTasks.map(t => 
          t.id === taskId 
            ? { 
                ...t, 
                isDoerVerified: true, 
                isRequestorVerified: updatedTask.is_requestor_verified 
              } 
            : t
        ));
      } else {
        // Update in created tasks
        setTasks(tasks.map(t => 
          t.id === taskId 
            ? { 
                ...t, 
                isRequestorVerified: true, 
                isDoerVerified: updatedTask.is_doer_verified 
              } 
            : t
        ));
      }
      
      // If both are verified, mark the task as completed and trigger rating
      if (updatedTask.is_requestor_verified && updatedTask.is_doer_verified) {
        await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);
          
        // Update task status in state
        if (isDoer) {
          const completedTask = appliedTasks.find(t => t.id === taskId);
          if (completedTask) {
            setCurrentTaskForRating(completedTask);
            setIsRatingDialogOpen(true);
            
            // Update applied tasks status
            setAppliedTasks(appliedTasks.map(t => 
              t.id === taskId ? { ...t, status: 'completed' } : t
            ));
          }
        } else {
          const completedTask = tasks.find(t => t.id === taskId);
          if (completedTask) {
            setCurrentTaskForRating(completedTask);
            setIsRatingDialogOpen(true);
            
            // Update tasks status
            setTasks(tasks.map(t => 
              t.id === taskId ? { ...t, status: 'completed' } : t
            ));
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error verifying code:", error);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleSubmitRating = async (rating: number) => {
    if (!currentTaskForRating || !user) return;
    
    try {
      const isDoer = currentTaskForRating.doerId === user.id;
      
      if (isDoer) {
        // Doer is rating the creator/requestor
        const { error } = await supabase
          .from('profiles')
          .update({
            requestor_rating: rating
          })
          .eq('id', currentTaskForRating.creatorId);
          
        if (error) throw error;
      } else {
        // Creator is rating the doer
        const { error } = await supabase
          .from('profiles')
          .update({
            doer_rating: rating
          })
          .eq('id', currentTaskForRating.doerId || '');
          
        if (error) throw error;
      }
      
      setIsRatingDialogOpen(false);
      setCurrentTaskForRating(null);
      
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!"
      });
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getActiveTasks = () => {
    const createdActiveTasks = tasks.filter(task => task.status === 'active');
    const userDoingTasks = appliedTasks.filter(task => task.doerId === user?.id && task.status === 'active');
    return [...createdActiveTasks, ...userDoingTasks];
  };

  const getCreatedTasks = () => {
    return tasks.filter(task => task.creatorId === user?.id);
  };

  const getApprovedTasks = () => {
    // Tasks where the user is either the creator or doer and verification is in progress
    const approvedCreatedTasks = tasks.filter(
      task => task.status === 'active' && task.doerId && (task.requestorVerificationCode || task.doerVerificationCode)
    );
    
    const approvedDoingTasks = appliedTasks.filter(
      task => task.status === 'active' && task.doerId === user?.id && (task.requestorVerificationCode || task.doerVerificationCode)
    );
    
    return [...approvedCreatedTasks, ...approvedDoingTasks];
  };

  const getPendingApplications = () => {
    return applications.filter(app => app.status === 'pending');
  };

  return (
    <Layout requireAuth>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Tabs defaultValue="active" className="w-full">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="active">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Active ({getActiveTasks().length})</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="approved">
                  <div className="flex items-center gap-1">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Approved ({getApprovedTasks().length})</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="applied">
                  <div className="flex items-center gap-1">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Applied ({appliedTasks.length})</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="requests">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>Requests ({getPendingApplications().length})</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="created">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Created ({getCreatedTasks().length})</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="completed">Completed Tasks</TabsTrigger>
              </TabsList>
              
              <Button 
                className="flex items-center gap-2"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <PlusCircle size={18} />
                Create Task
              </Button>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <CreateTaskForm 
                    onSubmit={handleCreateTask} 
                    onCancel={() => setIsCreateDialogOpen(false)} 
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <TabsContent value="active" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : getActiveTasks().length > 0 ? (
                <div className="flex flex-col space-y-6">
                  {getActiveTasks().map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onCancel={task.creatorId === user?.id ? handleCancelTask : undefined}
                      onEdit={task.creatorId === user?.id ? handleEditTask : undefined}
                      isOwner={task.creatorId === user?.id}
                      onApply={handleApplyForTask}
                      onJoinJointTask={handleJoinJointTask}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">You don't have any active tasks.</p>
                  <p className="text-muted-foreground">Click the "Create Task" button to create one!</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="approved" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : getApprovedTasks().length > 0 ? (
                <div className="flex flex-col space-y-6">
                  {getApprovedTasks().map(task => {
                    const isDoer = task.doerId === user?.id;
                    const userId = user?.id || '';
                    const partnerId = isDoer ? task.creatorId : (task.doerId || '');
                    
                    return (
                      <VerificationCodeCard
                        key={task.id}
                        taskId={task.id}
                        taskTitle={task.title}
                        code={isDoer ? task.doerVerificationCode || '' : task.requestorVerificationCode || ''}
                        partnerId={partnerId}
                        partnerName={isDoer ? task.creatorName : 'Task Doer'}
                        isDoer={isDoer}
                        isVerified={isDoer ? (task.isDoerVerified || false) : (task.isRequestorVerified || false)}
                        isPartnerVerified={isDoer ? (task.isRequestorVerified || false) : (task.isDoerVerified || false)}
                        onVerify={handleVerifyCode}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">You don't have any approved tasks in progress.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="applied">
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : appliedTasks.length > 0 ? (
                <div className="flex flex-col space-y-6">
                  {appliedTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isOwner={false}
                      applicationStatus={task.applicationStatus}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">You haven't applied to any tasks yet.</p>
                  <p className="text-muted-foreground">Browse the marketplace to find tasks you'd like to complete!</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="requests" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading applications...</p>
                </div>
              ) : getPendingApplications().length > 0 ? (
                <div className="flex flex-col space-y-4">
                  {getPendingApplications().map(application => (
                    <TaskApplicationCard
                      key={application.id}
                      application={application}
                      onApprove={handleApproveApplication}
                      onReject={handleRejectApplication}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">You don't have any pending applications for your tasks.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="created" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : getCreatedTasks().length > 0 ? (
                <div className="flex flex-col space-y-6">
                  {getCreatedTasks().map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onCancel={handleCancelTask}
                      onEdit={handleEditTask}
                      isOwner={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">You haven't created any tasks yet.</p>
                  <p className="text-muted-foreground">Click the "Create Task" button to create one!</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed">
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : tasks.filter(task => task.status === 'completed').length > 0 ? (
                <div className="flex flex-col space-y-6">
                  {tasks
                    .filter(task => task.status === 'completed')
                    .map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isOwner={true}
                        isCompleted={true}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">You don't have any completed tasks yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <RatingDialog
        isOpen={isRatingDialogOpen}
        onClose={() => setIsRatingDialogOpen(false)}
        onSubmit={handleSubmitRating}
        taskTitle={currentTaskForRating?.title || ''}
        partnerName={currentTaskForRating?.doerId === user?.id 
          ? currentTaskForRating.creatorName 
          : 'Task Doer'}
        isDoer={currentTaskForRating?.doerId === user?.id}
      />
    </Layout>
  );
};

export default Task;

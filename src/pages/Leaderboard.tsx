import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  tasksCount: number;
}

const Leaderboard = () => {
  const [topRequestors, setTopRequestors] = useState<LeaderboardUser[]>([]);
  const [topDoers, setTopDoers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch tasks for requestors data
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('creator_id, creator_rating')
          .not('creator_rating', 'is', null);

        if (tasksError) throw tasksError;

        // Process and aggregate the requestor data manually
        const requestorMap = new Map<string, {
          id: string;
          rating: number;
          tasksCount: number;
        }>();

        if (tasksData) {
          tasksData.forEach(task => {
            if (!task.creator_id || typeof task.creator_rating !== 'number') return;
            
            if (requestorMap.has(task.creator_id)) {
              // Update existing entry
              const existing = requestorMap.get(task.creator_id)!;
              existing.tasksCount += 1;
              // We keep the highest rating
              if (task.creator_rating > existing.rating) {
                existing.rating = task.creator_rating;
              }
            } else {
              // Create new entry
              requestorMap.set(task.creator_id, {
                id: task.creator_id,
                rating: task.creator_rating,
                tasksCount: 1
              });
            }
          });
        }

        // Fetch user data for each requestor
        const requestors: LeaderboardUser[] = [];
        
        for (const [id, data] of requestorMap.entries()) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', id)
            .single();
            
          requestors.push({
            id,
            username: profileData?.username || 'Unknown User',
            avatar_url: profileData?.avatar_url,
            rating: data.rating,
            tasksCount: data.tasksCount
          });
        }

        // Sort by rating and limit to top 10
        const topRequestors = requestors
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 10);

        setTopRequestors(topRequestors);

        // Fetch tasks for doers data
        const { data: doersData, error: doersError } = await supabase
          .from('tasks')
          .select('doer_id, doer_rating')
          .not('doer_id', 'is', null)
          .not('doer_rating', 'is', null)
          .eq('status', 'completed');

        if (doersError) throw doersError;

        // Process and aggregate the doer data manually
        const doerMap = new Map<string, {
          id: string;
          rating: number;
          tasksCount: number;
        }>();

        if (doersData) {
          doersData.forEach(task => {
            if (!task.doer_id || typeof task.doer_rating !== 'number') return;
            
            if (doerMap.has(task.doer_id)) {
              // Update existing entry
              const existing = doerMap.get(task.doer_id)!;
              existing.tasksCount += 1;
              // We keep the highest rating
              if (task.doer_rating > existing.rating) {
                existing.rating = task.doer_rating;
              }
            } else {
              // Create new entry
              doerMap.set(task.doer_id, {
                id: task.doer_id,
                rating: task.doer_rating,
                tasksCount: 1
              });
            }
          });
        }

        // Fetch user data for each doer
        const doers: LeaderboardUser[] = [];
        
        for (const [id, data] of doerMap.entries()) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', id)
            .single();
            
          doers.push({
            id,
            username: profileData?.username || 'Unknown User',
            avatar_url: profileData?.avatar_url,
            rating: data.rating,
            tasksCount: data.tasksCount
          });
        }

        // Sort by rating and limit to top 10
        const topDoers = doers
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 10);

        setTopDoers(topDoers);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const renderLeaderboard = (users: LeaderboardUser[]) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {users.map((user, index) => (
          <Card key={user.id} className={index < 3 ? "border-primary/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 text-center">
                  {index === 0 ? (
                    <Trophy className="h-8 w-8 text-yellow-500 mx-auto" />
                  ) : index === 1 ? (
                    <Trophy className="h-8 w-8 text-gray-400 mx-auto" />
                  ) : index === 2 ? (
                    <Trophy className="h-8 w-8 text-amber-700 mx-auto" />
                  ) : (
                    <div className="font-bold text-lg text-muted-foreground">{index + 1}</div>
                  )}
                </div>
                
                <Avatar className="h-10 w-10">
                  {user.avatar_url ? (
                    <AvatarImage src={user.avatar_url} alt={user.username} />
                  ) : (
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="font-medium">{user.username}</h3>
                  <p className="text-sm text-muted-foreground">
                    {user.tasksCount} task{user.tasksCount !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <Badge variant="outline" className="ml-auto font-medium">
                  {user.rating.toFixed(1)} ★
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Community Leaderboard</h1>
        
        <Tabs defaultValue="requestors">
          <TabsList className="mb-6">
            <TabsTrigger value="requestors">Top Requestors</TabsTrigger>
            <TabsTrigger value="doers">Top Doers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="requestors">
            <div className="max-w-3xl mx-auto">
              <CardHeader className="px-0">
                <CardTitle className="text-xl">Top Rated Requestors</CardTitle>
              </CardHeader>
              {renderLeaderboard(topRequestors)}
            </div>
          </TabsContent>
          
          <TabsContent value="doers">
            <div className="max-w-3xl mx-auto">
              <CardHeader className="px-0">
                <CardTitle className="text-xl">Top Rated Doers</CardTitle>
              </CardHeader>
              {renderLeaderboard(topDoers)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Leaderboard;

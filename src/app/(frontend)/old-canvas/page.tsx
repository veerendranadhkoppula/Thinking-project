'use client'

import { useEffect, useState } from 'react'
import SidebarWithCreateCanvas from '../components/homepage/home_client'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CardMedia,
  CircularProgress,
  Grid,
} from '@mui/material'
import Link from 'next/link'
import { getSession } from 'next-auth/react'

interface CanvasData {
  id: string
  title: string
  url: string
  type: {
    mediaType: string
    injectionType: string
  }
}

export default function CreateCanvas() {
  const [canvases, setCanvases] = useState<CanvasData[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchCanvases = async () => {
      try {
        const res = await fetch('/api/canvas-website?limit=100')
        const json = await res.json()
        console.log('Canvas Data:', res)
        setCanvases(json?.docs || [])
      } catch (err) {
        console.error('Failed to fetch canvases:', err)
      } finally {
        setLoading(false)
      }
    }
    console.log('Fetching Canvas Data...')
    fetchCanvases()
  }, [])

  return (
    <Box display="flex" minHeight="100vh" bgcolor="#0d0d0d" color="#fff">
      <SidebarWithCreateCanvas />

      <Box flex={1} p={4} ml="250px">
        <Typography variant="h4" gutterBottom>
          Created Canvases
        </Typography>
        <h2>Welcome, {user.name}!</h2>
        <p>Your email: {user.email}</p>

        {loading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={3}>
            {canvases.map((canvas) => (
              <Grid key={canvas.id}>
                <Link href={`/canvas/${canvas.id}`} passHref>
                  <Card
                    sx={{
                      bgcolor: '#1e1e1e',
                      border: '1px solid #333',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" color="#fff">
                        {canvas.title}
                      </Typography>
                      <Typography variant="body2" color="#aaa">
                        Type: {canvas.type.mediaType} | Injection: {canvas.type.injectionType}
                      </Typography>
                    </CardContent>

                    <CardMedia
                      component="iframe"
                      src={canvas.url}
                      sx={{ height: 200, border: 'none', overflow: 'hidden' }}
                    />
                  </Card>
                </Link>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  )
}

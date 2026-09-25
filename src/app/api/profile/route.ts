import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;

    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail! },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        image: true,
        presenceStatus: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    const body = await req.json();
    const { name, email, password, currentPassword, avatarUrl } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.id !== userId && existingUser.email !== userEmail) {
      return NextResponse.json({ error: 'Email is already in use by another account' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: userId ? { id: userId } : { email: userEmail! }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {
      name,
      email,
    };

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
      updateData.image = avatarUrl;
    }

    if (password && password.trim().length > 0) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }

      if (currentUser.password) {
        const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
        if (!isMatch) {
          return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
        }
      }

      if (password.trim().length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: userId ? { id: userId } : { email: userEmail! },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        image: true,
      }
    });

    return NextResponse.json({ message: 'Profile updated successfully', user: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

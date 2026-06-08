package com.example.blog.service;

import com.example.blog.common.CurrentUser;
import com.example.blog.dto.AuthResponse;
import com.example.blog.dto.LoginRequest;
import com.example.blog.dto.RegisterRequest;
import com.example.blog.entity.User;
import com.example.blog.exception.BusinessException;
import com.example.blog.mapper.UserMapper;
import com.example.blog.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthService {
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserMapper userMapper, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validateUsernameAndPassword(request.username(), request.password());
        if (userMapper.findByUsername(request.username()) != null) {
            throw new BusinessException("用户名已存在");
        }

        User user = new User();
        user.setUsername(request.username().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setNickname(StringUtils.hasText(request.nickname()) ? request.nickname().trim() : request.username().trim());
        userMapper.insert(user);
        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        validateUsernameAndPassword(request.username(), request.password());
        User user = userMapper.findByUsername(request.username().trim());
        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException("用户名或密码错误");
        }
        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtTokenProvider.generateToken(new CurrentUser(user.getId(), user.getUsername()));
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getNickname());
    }

    private void validateUsernameAndPassword(String username, String password) {
        if (!StringUtils.hasText(username) || username.trim().length() < 3) {
            throw new BusinessException("用户名至少需要 3 个字符");
        }
        if (!StringUtils.hasText(password) || password.length() < 6) {
            throw new BusinessException("密码至少需要 6 个字符");
        }
    }
}

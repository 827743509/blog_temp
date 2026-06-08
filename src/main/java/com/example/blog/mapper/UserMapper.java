package com.example.blog.mapper;

import com.example.blog.entity.User;
import org.apache.ibatis.annotations.Param;

public interface UserMapper {
    User findById(@Param("id") Long id);

    User findByUsername(@Param("username") String username);

    int insert(User user);
}
